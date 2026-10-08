// Hjälpare för felkontrollens tester (tests/integration/health.test.ts).
//
// Kontrollerna tittar på hela databasen, inte på ett enskilt köp, så varje
// test börjar från tom databas (resetDb) och bygger exakt det fel det gäller.
// Byggstenarna här ger data som är helt frisk — en lärare med profil och
// lärarroll, en kurs med sal och produkt — så att ett test kan säga "nu slår
// den här kontrollen till, och ingen annan".

import { randomUUID } from "node:crypto";
import pg from "pg";
import { getHealthDetail, getHealthIssues } from "@/lib/admin-health";
import prisma from "@/lib/prisma";
import { createCourse, createUser } from "./factories";

/**
 * Tömmer alla tabeller utom migrationerna och terminerna.
 *
 * Terminen sparas för att factories.ts cachar den i en modulvariabel — tas
 * den bort pekar nästa createCourse på en termin som inte finns. Testterminen
 * är aktiv och pågående, så den utlöser ingen kontroll.
 */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations', 'Termin')`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  // Terminer som ett test själv lagt till (t.ex. en utgången) ska bort, men
  // inte factories-terminen.
  await prisma.termin.deleteMany({ where: { name: { not: "Testtermin" } } });
}

/** Antalet träffar per kontroll, bara de som slår till: { id: antal }. */
export async function issueCounts(): Promise<Record<string, number>> {
  const issues = await getHealthIssues();
  return Object.fromEntries(issues.map((issue) => [issue.id, issue.count]));
}

/** Antalet träffar för en enskild kontroll, 0 om den inte slår till. */
export async function issueCount(id: string): Promise<number> {
  return (await issueCounts())[id] ?? 0;
}

/** Raderna i detaljvyn för en kontroll. Kastar om kontrollen inte finns. */
export async function detailRows(id: string) {
  const detail = await getHealthDetail(id);
  if (!detail) throw new Error(`Okänd kontroll: ${id}`);
  return detail.rows;
}

/** En lärare som inte utlöser några lärarkontroller: rätt roll och profil. */
export async function createTeacher() {
  const teacher = await createUser({ role: "teacher" });
  await prisma.teacherProfile.create({
    data: {
      name: teacher.name,
      specialty: "Testdans",
      description: "Testlärare",
      userId: teacher.id,
    },
  });
  return teacher;
}

let studio: { id: string } | null = null;

async function getStudio() {
  if (studio) {
    const exists = await prisma.studio.findUnique({ where: { id: studio.id } });
    if (exists) return studio;
  }
  studio = await prisma.studio.create({
    data: { name: `sal-${randomUUID().slice(0, 8)}`, description: "Testsal" },
  });
  return studio;
}

/**
 * createCourse, men schemaposten får en sal — annars slår
 * "schema-without-studio" till på varenda kurs. Kursen saknar fortfarande
 * produkt tills en skapas med createProduct.
 */
export async function createHealthyCourse(
  opts: Parameters<typeof createCourse>[0],
) {
  const course = await createCourse(opts);
  const s = await getStudio();
  await prisma.schemaItem.updateMany({
    where: { courseId: course.id },
    data: { studioId: s.id },
  });
  return course;
}

/**
 * Räknar SQL-frågor som går till databasen medan `fn` körs. Prisma 7 pratar
 * med Postgres via @prisma/adapter-pg, som i sin tur använder pg — varje
 * fråga passerar alltså pg.Client.prototype.query.
 */
export async function countQueries<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; queries: number }> {
  const original = pg.Client.prototype.query;
  let queries = 0;
  // biome-ignore lint/suspicious/noExplicitAny: pg:s query har många överlagringar.
  pg.Client.prototype.query = function (this: pg.Client, ...args: any[]) {
    queries++;
    // biome-ignore lint/suspicious/noExplicitAny: se ovan.
    return (original as any).apply(this, args);
  } as typeof original;
  try {
    const result = await fn();
    return { result, queries };
  } finally {
    pg.Client.prototype.query = original;
  }
}
