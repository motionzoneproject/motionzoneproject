/**
 * Lägger in närvarodata så "Min närvaro" och kalendern går att prova lokalt.
 *
 *   npm run seed:attendance -- <din-email>   # lägg in åt ett befintligt konto
 *   npm run seed:attendance -- --clean       # ta bort allt igen
 *
 * Kontot du anger får närvaro på 22 lektioner (var fjärde frånvaro), och en
 * testdeltagare som kontot har lagt till får 8. Allt nytt får id:n som börjar med "zztest-att-", så det
 * är trivialt att känna igen och städa bort. Ditt eget konto ändras aldrig.
 *
 * VÄGRAR köra mot något annat än localhost.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "";

function assertLocalDatabase() {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    console.error("FEL: DATABASE_URL saknas eller går inte att tolka.");
    process.exit(1);
  }

  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    console.error(
      `FEL: DATABASE_URL pekar på "${host}", inte localhost.\n` +
        "Det här skriptet får bara köras mot en lokal utvecklingsdatabas.",
    );
    process.exit(1);
  }
}

assertLocalDatabase();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const P = "zztest-att-";
const id = (name: string) => `${P}${name}`;
const DAY = 24 * 60 * 60 * 1000;

/** Omvänd beroendeordning, så FK:er inte blockerar. */
async function clean() {
  await prisma.attendance.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.lesson.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.schemaItem.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.course.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.termin.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.participant.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } });
}

/** Dagar bakåt från idag (0 = idag) som får en lektion. Flera i innevarande månad. */
const LESSON_OFFSETS = [
  0, 1, 3, 7, 8, 10, 14, 17, 21, 24, 28, 31, 35, 38, 42, 49, 56, 63, 70, 84, 98,
  112,
];

async function seed(email: string) {
  const owner = await prisma.user.findUnique({ where: { email } });
  if (!owner) {
    console.error(`FEL: hittar inget konto med e-post ${email}.`);
    process.exit(1);
  }

  await prisma.user.create({
    data: {
      id: id("teacher"),
      name: "[TEST] Lina Lärare",
      email: "zztest-att-teacher@example.invalid",
      role: "user",
    },
  });

  await prisma.participant.create({
    data: {
      id: id("child"),
      name: "[TEST] Esther Barn",
      addedByUserId: owner.id,
    },
  });

  await prisma.termin.create({
    data: {
      id: id("termin"),
      name: "[TEST] Närvarotermin",
      startDate: new Date(Date.now() - 140 * DAY),
      endDate: new Date(Date.now() + 60 * DAY),
      active: true,
    },
  });

  await prisma.course.createMany({
    data: [
      {
        id: id("course-a"),
        name: "[TEST] Balett",
        description: "Testkurs",
        teacherId: id("teacher"),
      },
      {
        id: id("course-b"),
        name: "[TEST] Jazz",
        description: "Testkurs",
        teacherId: id("teacher"),
      },
    ],
  });

  const timeStart = new Date("1970-01-01T17:00:00.000Z");
  const timeEnd = new Date("1970-01-01T18:00:00.000Z");
  await prisma.schemaItem.createMany({
    data: ["a", "b"].map((k) => ({
      id: id(`schema-${k}`),
      weekday: "TUESDAY" as const,
      timeStart,
      timeEnd,
      terminId: id("termin"),
      courseId: id(`course-${k}`),
    })),
  });

  let attendanceCount = 0;
  for (const [i, offset] of LESSON_OFFSETS.entries()) {
    const k = i % 2 === 0 ? "a" : "b";
    const start = new Date(Date.now() - offset * DAY);
    start.setUTCHours(17, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const lessonId = id(`lesson-${i}`);

    await prisma.lesson.create({
      data: {
        id: lessonId,
        startTime: start,
        endTime: end,
        terminId: id("termin"),
        courseId: id(`course-${k}`),
        teacherId: id("teacher"),
        schemaItemId: id(`schema-${k}`),
      },
    });

    // Kontot själv: nästan alla lektioner, var fjärde frånvarande.
    // Barnet: bara var tredje lektion, var tredje av dem frånvarande.
    const rows = [];
    rows.push({
      id: id(`att-user-${i}`),
      lessonId,
      studentKey: `user:${owner.id}`,
      userId: owner.id,
      status: i % 4 === 3 ? ("ABSENT" as const) : ("PRESENT" as const),
      markedByUserId: id("teacher"),
    });
    if (i % 3 === 0) {
      rows.push({
        id: id(`att-child-${i}`),
        lessonId,
        studentKey: `participant:${id("child")}`,
        participantId: id("child"),
        status: i % 9 === 0 ? ("ABSENT" as const) : ("PRESENT" as const),
        markedByUserId: id("teacher"),
      });
    }
    if (rows.length > 0) {
      await prisma.attendance.createMany({ data: rows });
      attendanceCount += rows.length;
    }
  }

  console.log(
    `Klart: ${LESSON_OFFSETS.length} lektioner och ${attendanceCount} närvarorader åt ${email}.`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  await clean();
  if (args.includes("--clean")) {
    console.log("Testdatan är borttagen.");
    return;
  }
  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("FEL: ange e-post, t.ex. npm run seed:attendance -- du@x.se");
    process.exit(1);
  }
  await seed(email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
