// Felkontrollen och elevlistorna mot en kopia av produktionsdatan.
//
// tests/setup/prod-copy-db.ts klonar PROD_COPY_DATABASE_URL och kör
// branchens migrationer på klonen, så här ser vi att migrationerna går
// igenom på riktig data och att koden som läser den inte kastar.
//
// Datan innehåller persondata. Ingenting här får skriva ut namn, e-post
// eller telefon — bara antal och id:n. Testerna läser bara, de ändrar inget.
//
// Invarianterna längst ned gäller den riktiga datan. Bryts en är det i
// första hand ett dataproblem i produktion, inte ett testfel — därför
// expect.soft, så att alla rapporteras på en gång.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runHealthChecks } from "@/lib/actions/health-actions";
import {
  getCourseRoster,
  getCourseStudentCounts,
} from "@/lib/actions/roster-actions";
import {
  getHealthCheckInfo,
  getHealthDetail,
  getHealthIssues,
} from "@/lib/admin-health";
import prisma from "@/lib/prisma";
import { actAs } from "../helpers/session";

const enabled = Boolean(process.env.PROD_COPY_DATABASE_URL);

/** Generöst — kopian är liten, men en kontroll som tar sekunder är ett fel. */
const MAX_CHECK_MS = 5_000;
const MAX_ALL_CHECKS_MS = 15_000;

const CHECK_IDS = getHealthCheckInfo().map((check) => check.id);

async function countSql(sql: TemplateStringsArray): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>(sql);
  return Number(rows[0]?.n ?? 0);
}

/** Loggar ett antal under en etikett. Aldrig persondata. */
function report(label: string, n: number) {
  console.log(`[prod-copy] ${label}: ${n}`);
}

describe.skipIf(!enabled)("produktionskopian", () => {
  beforeAll(async () => {
    const admin = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) throw new Error("Kopian saknar en admin-användare.");
    actAs({ id: admin.id, role: "admin" });
  });

  describe("migrationerna", () => {
    it("kör mot klonen, aldrig mot källan", () => {
      const source = new URL(process.env.PROD_COPY_DATABASE_URL ?? "");
      const current = new URL(process.env.DATABASE_URL ?? "");
      expect(current.pathname).not.toBe(source.pathname);
      expect(current.pathname.startsWith(`${source.pathname}_test_`)).toBe(
        true,
      );
    });

    it("alla branchens migrationer är applicerade och ingen har fallerat", async () => {
      const dir = join(process.cwd(), "prisma", "migrations");
      const local = readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

      const applied = await prisma.$queryRaw<
        {
          migration_name: string;
          finished_at: Date | null;
          rolled_back_at: Date | null;
        }[]
      >`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`;

      const finished = new Set(
        applied
          .filter((m) => m.finished_at !== null && m.rolled_back_at === null)
          .map((m) => m.migration_name),
      );
      expect(local.filter((name) => !finished.has(name))).toEqual([]);
      expect(finished.has("20260925090000_course_roster_entry")).toBe(true);

      const failed = applied.filter(
        (m) => m.finished_at === null && m.rolled_back_at === null,
      );
      expect(failed.map((m) => m.migration_name)).toEqual([]);
    });

    it("course_roster_entry finns och går att läsa", async () => {
      const n = await prisma.courseRosterEntry.count();
      report("course_roster_entry-rader", n);
      expect(n).toBeGreaterThanOrEqual(0);
    });
  });

  describe("felkontrollen", () => {
    it("alla kontroller körs utan att kasta och inom rimlig tid", async () => {
      const start = performance.now();
      const issues = await getHealthIssues();
      const ms = performance.now() - start;
      report("getHealthIssues ms", Math.round(ms));
      for (const issue of issues) report(`träffar ${issue.id}`, issue.count);
      expect(ms).toBeLessThan(MAX_ALL_CHECKS_MS);

      // Via server action som admin — samma väg som knappen.
      const result = await runHealthChecks();
      expect(result.success).toBe(true);
    });

    it.each(CHECK_IDS)("%s: detaljvyn fungerar", async (id) => {
      const start = performance.now();
      const detail = await getHealthDetail(id);
      const ms = performance.now() - start;
      report(`detalj ${id} ms`, Math.round(ms));

      expect(detail).not.toBeNull();
      expect(ms).toBeLessThan(MAX_CHECK_MS);
      for (const row of detail?.rows ?? []) {
        expect(typeof row.id).toBe("string");
        expect(typeof row.title).toBe("string");
      }
      // Detaljvyn och översikten ska vara överens om antalet, så länge
      // listan inte kapats.
      const issues = await getHealthIssues();
      const count = issues.find((issue) => issue.id === id)?.count ?? 0;
      if (!detail?.truncated && id !== "negative-balance") {
        // negative-balance listar kursrader och klippkort i två listor om
        // var sin take, men räknar dem ihop — samma sak i båda så länge
        // ingen av dem kapas.
        expect.soft(detail?.rows.length, `antal rader för ${id}`).toBe(count);
      }
    });
  });

  describe("purchase-without-bookings i riktig data", () => {
    // Granskningsfynd a: klippkort för en kurs flaggas som allvarligt fel
    // fast noll bokningar är det normala. Hur många av träffarna i
    // produktion är sådana — och skulle bli felaktigt inbokade av "Boka in"?
    it("flaggar inga klippkort", async () => {
      const detail = await getHealthDetail("purchase-without-bookings");
      const ids = detail?.rows.map((row) => row.id) ?? [];
      const items = await prisma.purchaseItem.findMany({
        where: { id: { in: ids } },
        select: {
          purchase: {
            select: { type: true, product: { select: { autobook: true } } },
          },
        },
      });
      const byKind = new Map<string, number>();
      for (const item of items) {
        const key = `${item.purchase.type}/${item.purchase.product.autobook ? "autobook" : "manuell"}`;
        byKind.set(key, (byKind.get(key) ?? 0) + 1);
      }
      for (const [key, n] of byKind)
        report(`purchase-without-bookings ${key}`, n);

      const clips = items.filter((item) => item.purchase.type === "CLIP");
      expect.soft(clips.length, "klippkort bland träffarna").toBe(0);
    });
  });

  describe("elevlistorna", () => {
    it("getCourseStudentCounts och getCourseRoster fungerar för varje kurs och är överens", async () => {
      const courses = await prisma.course.findMany({ select: { id: true } });
      report("kurser", courses.length);
      expect(courses.length).toBeGreaterThan(0);

      const ids = courses.map((c) => c.id);
      const start = performance.now();
      const counts = await getCourseStudentCounts(ids);
      report(
        "getCourseStudentCounts ms",
        Math.round(performance.now() - start),
      );
      expect(Object.keys(counts).sort()).toEqual([...ids].sort());

      let mismatches = 0;
      for (const id of ids) {
        const roster = await getCourseRoster(id);
        expect(roster, `roster för kurs ${id}`).not.toBeNull();
        expect(counts[id]).toBeGreaterThanOrEqual(0);
        if (roster?.students.length !== counts[id]) mismatches++;
        expect
          .soft(roster?.students.length, `elever i kurs ${id}`)
          .toBe(counts[id]);
      }
      report("kurser där lista och antal skiljer sig", mismatches);
    });
  });

  describe("datainvarianter", () => {
    it("inga negativa saldon på purchase eller purchase_item", async () => {
      const items = await countSql`
        SELECT COUNT(*)::bigint AS n FROM purchase_item WHERE "remainingCount" < 0`;
      const purchases = await countSql`
        SELECT COUNT(*)::bigint AS n FROM purchase WHERE "remainingCount" < 0`;
      report("purchase_item med negativt saldo", items);
      report("purchase med negativt saldo", purchases);
      expect.soft(items, "purchase_item med negativt saldo").toBe(0);
      expect.soft(purchases, "purchase med negativt saldo").toBe(0);
    });

    it("varje beviljad order har ett köp", async () => {
      const n = await countSql`
        SELECT COUNT(*)::bigint AS n FROM "order" o
        WHERE o.status = 'APPROVED'
          AND NOT EXISTS (SELECT 1 FROM purchase p WHERE p."orderId" = o.id)`;
      report("beviljade ordrar utan köp", n);
      expect.soft(n, "beviljade ordrar utan köp").toBe(0);
    });

    it("varje bokning pekar på en kursrad för lektionens kurs", async () => {
      const all = await countSql`
        SELECT COUNT(*)::bigint AS n FROM "Booking" b
        JOIN lesson l ON l.id = b."lessonId"
        JOIN purchase_item pi ON pi.id = b."purchaseItemId"
        WHERE pi."courseId" <> l."courseId"`;
      const active = await countSql`
        SELECT COUNT(*)::bigint AS n FROM "Booking" b
        JOIN lesson l ON l.id = b."lessonId"
        JOIN purchase_item pi ON pi.id = b."purchaseItemId"
        WHERE b.cancelled = false AND pi."courseId" <> l."courseId"`;
      report("bokningar på fel kurs (alla)", all);
      report("bokningar på fel kurs (ej avbokade)", active);
      expect.soft(all, "bokningar på fel kurs").toBe(0);
    });

    it("inga dubbla bokningar på samma lektion för samma köp", async () => {
      const groups = await countSql`
        SELECT COUNT(*)::bigint AS n FROM (
          SELECT 1 FROM "Booking" b
          JOIN purchase_item pi ON pi.id = b."purchaseItemId"
          WHERE b.cancelled = false
          GROUP BY b."lessonId", pi."purchaseId"
          HAVING COUNT(*) > 1
        ) d`;
      const sameItem = await countSql`
        SELECT COUNT(*)::bigint AS n FROM (
          SELECT 1 FROM "Booking"
          WHERE cancelled = false
          GROUP BY "lessonId", "purchaseItemId"
          HAVING COUNT(*) > 1
        ) d`;
      report("lektioner med samma köp bokat flera gånger", groups);
      report("lektioner med samma kursrad bokad flera gånger", sameItem);
      expect.soft(groups, "dubbla bokningar per köp").toBe(0);
      expect.soft(sameItem, "dubbla bokningar per kursrad").toBe(0);
    });

    it("course_roster_entry: studentKey stämmer med userId/participantId", async () => {
      const n = await countSql`
        SELECT COUNT(*)::bigint AS n FROM course_roster_entry e
        WHERE e."studentKey" <> CASE
          WHEN e."participantId" IS NOT NULL THEN 'participant:' || e."participantId"
          ELSE 'user:' || e."userId" END`;
      report("roster-rader med fel studentKey", n);
      expect.soft(n).toBe(0);
    });
  });
});
