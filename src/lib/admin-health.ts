// Felsökningskontroller för adminöversikten: sådant som är tyst trasigt i
// datan, alltså inte kraschar men gör att något beter sig fel för kunden.
//
// Varje kontroll kan både räknas (för översikten) och listas (för detaljvyn
// på /admin/health/[id]), så man kan gå från "2 st" till vilka två det är.
//
// Ligger medvetet utanför en "use server"-fil — se admin-overview.ts. Kör bara
// från /admin, som redan vaktat att användaren är admin.

import type { Prisma } from "@/generated/prisma/client";
import { formatShortFriendlyDate } from "./date-utils";
import { formatPrice } from "./money";
import prisma from "./prisma";
import { dbToFormTime } from "./time-convert";
import { getVeckodag } from "./tools";

export type HealthSeverity = "warning" | "serious";

/** Så långa listor blir det aldrig i praktiken, men en gräns är en gräns. */
export const HEALTH_ROW_LIMIT = 200;

export type HealthRow = {
  id: string;
  title: string;
  detail?: string;
};

export type HealthIssue = {
  id: string;
  count: number;
  label: string;
  /** Varför det spelar roll — annars går det inte att prioritera. */
  description: string;
  severity: HealthSeverity;
};

type Check = {
  id: string;
  singular: string;
  plural: string;
  description: string;
  /** Vart man går för att faktiskt laga det. */
  fixHref: string;
  fixLabel: string;
  severity: HealthSeverity;
  count: () => Promise<number>;
  list: () => Promise<HealthRow[]>;
};

const take = HEALTH_ROW_LIMIT;

const productWithoutCourse = {
  active: true,
  courses: { none: {} },
} satisfies Prisma.ProductWhereInput;

const courseWithoutSchema = {
  active: true,
  schemaItems: { none: {} },
} satisfies Prisma.CourseWhereInput;

const courseWithoutProduct = {
  active: true,
  products: { none: {} },
} satisfies Prisma.CourseWhereInput;

const schemaWithoutStudio = {
  studioId: null,
} satisfies Prisma.SchemaItemWhereInput;

const bookingOnCancelled = {
  cancelled: false,
  lesson: { cancelled: true },
} satisfies Prisma.BookingWhereInput;

const courseTeacherWithoutRole = {
  active: true,
  teacher: { role: { notIn: ["admin", "teacher"] } },
} satisfies Prisma.CourseWhereInput;

const teacherWithoutProfile = {
  teacherProfile: null,
  teachingCourses: { some: { active: true } },
} satisfies Prisma.UserWhereInput;

const checks: Check[] = [
  {
    id: "product-without-course",
    singular: "aktiv produkt utan kurser",
    plural: "aktiva produkter utan kurser",
    description: "Går att köpa men ger inte tillgång till någonting.",
    fixHref: "/admin/products",
    fixLabel: "Till produkter",
    severity: "serious",
    count: () => prisma.product.count({ where: productWithoutCourse }),
    list: async () => {
      const rows = await prisma.product.findMany({
        where: productWithoutCourse,
        select: { id: true, name: true, price: true },
        orderBy: { name: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: formatPrice(row.price),
      }));
    },
  },
  {
    id: "course-without-schema",
    singular: "aktiv kurs utan schemapost",
    plural: "aktiva kurser utan schemaposter",
    description: "Utan veckoschema skapas inga lektioner att boka.",
    fixHref: "/admin/termin",
    fixLabel: "Till terminer och scheman",
    severity: "warning",
    count: () => prisma.course.count({ where: courseWithoutSchema }),
    list: async () => {
      const rows = await prisma.course.findMany({
        where: courseWithoutSchema,
        select: { id: true, name: true, teacher: { select: { name: true } } },
        orderBy: { name: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: `Lärare: ${row.teacher.name}`,
      }));
    },
  },
  {
    id: "course-without-product",
    singular: "aktiv kurs ingår inte i någon produkt",
    plural: "aktiva kurser ingår inte i någon produkt",
    description: "Kursen finns men går inte att köpa sig till.",
    fixHref: "/admin/products",
    fixLabel: "Till produkter",
    severity: "warning",
    count: () => prisma.course.count({ where: courseWithoutProduct }),
    list: async () => {
      const rows = await prisma.course.findMany({
        where: courseWithoutProduct,
        select: { id: true, name: true, teacher: { select: { name: true } } },
        orderBy: { name: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: `Lärare: ${row.teacher.name}`,
      }));
    },
  },
  {
    id: "schema-without-studio",
    singular: "schemapost saknar sal",
    plural: "schemaposter saknar sal",
    description: "Lektionerna visas utan plats för eleverna.",
    fixHref: "/admin/termin",
    fixLabel: "Till terminer och scheman",
    severity: "warning",
    count: () => prisma.schemaItem.count({ where: schemaWithoutStudio }),
    list: async () => {
      const rows = await prisma.schemaItem.findMany({
        where: schemaWithoutStudio,
        select: {
          id: true,
          weekday: true,
          timeStart: true,
          timeEnd: true,
          course: { select: { name: true } },
          termin: { select: { name: true } },
        },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.course.name,
        detail: `${getVeckodag(row.weekday)} ${dbToFormTime(row.timeStart)}-${dbToFormTime(row.timeEnd)} · ${row.termin.name}`,
      }));
    },
  },
  {
    id: "booking-on-cancelled",
    singular: "bokning ligger kvar på en inställd lektion",
    plural: "bokningar ligger kvar på inställda lektioner",
    description:
      "Klippen borde ha återförts när lektionen ställdes in. Eleven har blivit av med ett tillfälle.",
    fixHref: "/admin/lectures?status=cancelled",
    fixLabel: "Till inställda lektioner",
    severity: "serious",
    count: () => prisma.booking.count({ where: bookingOnCancelled }),
    list: async () => {
      const rows = await prisma.booking.findMany({
        where: bookingOnCancelled,
        select: {
          id: true,
          user: { select: { name: true, email: true } },
          lesson: {
            select: { startTime: true, course: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.user.name,
        detail: `${row.lesson.course.name} · ${formatShortFriendlyDate(row.lesson.startTime)} · ${row.user.email}`,
      }));
    },
  },
  {
    id: "negative-balance",
    singular: "köp har negativt saldo",
    plural: "köp har negativt saldo",
    description: "Fler tillfällen har dragits än som fanns. Bokföringsfel.",
    fixHref: "/admin/students",
    fixLabel: "Till elever",
    severity: "serious",
    count: async () => {
      const [items, purchases] = await Promise.all([
        prisma.purchaseItem.count({ where: { remainingCount: { lt: 0 } } }),
        prisma.purchase.count({ where: { remainingCount: { lt: 0 } } }),
      ]);
      return items + purchases;
    },
    list: async () => {
      const [items, purchases] = await Promise.all([
        prisma.purchaseItem.findMany({
          where: { remainingCount: { lt: 0 } },
          select: {
            id: true,
            remainingCount: true,
            course: { select: { name: true } },
            purchase: { select: { user: { select: { name: true } } } },
          },
          take,
        }),
        prisma.purchase.findMany({
          where: { remainingCount: { lt: 0 } },
          select: {
            id: true,
            remainingCount: true,
            user: { select: { name: true } },
            product: { select: { name: true } },
          },
          take,
        }),
      ]);

      return [
        ...items.map((row) => ({
          id: `item-${row.id}`,
          title: row.purchase.user.name,
          detail: `${row.course.name} · saldo ${row.remainingCount} (kurstillfällen)`,
        })),
        ...purchases.map((row) => ({
          id: `purchase-${row.id}`,
          title: row.user.name,
          detail: `${row.product.name} · saldo ${row.remainingCount} (klippkort)`,
        })),
      ];
    },
  },
  {
    id: "teacher-without-role",
    singular: "aktiv kurs har en lärare utan lärarbehörighet",
    plural: "aktiva kurser har lärare utan lärarbehörighet",
    description:
      "Läraren kan inte logga in och hantera sina lektioner, och försvinner ur lärarlistorna.",
    fixHref: "/admin/users",
    fixLabel: "Till användare",
    severity: "warning",
    count: () => prisma.course.count({ where: courseTeacherWithoutRole }),
    list: async () => {
      const rows = await prisma.course.findMany({
        where: courseTeacherWithoutRole,
        select: {
          id: true,
          name: true,
          teacher: { select: { name: true, email: true, role: true } },
        },
        orderBy: { name: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: `${row.teacher.name} (${row.teacher.email}) har rollen ${row.teacher.role ?? "ingen"}`,
      }));
    },
  },
  {
    id: "teacher-without-profile",
    singular: "lärare saknar lärarprofil",
    plural: "lärare saknar lärarprofil",
    description: "Syns inte på den publika presentationssidan.",
    fixHref: "/admin/teachers",
    fixLabel: "Till lärarprofiler",
    severity: "warning",
    count: () => prisma.user.count({ where: teacherWithoutProfile }),
    list: async () => {
      const rows = await prisma.user.findMany({
        where: teacherWithoutProfile,
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: row.email,
      }));
    },
  },
];

/**
 * Kör alla kontroller och returnerar bara de som faktiskt slår till,
 * allvarligast först.
 */
export async function getHealthIssues(): Promise<HealthIssue[]> {
  const counts = await Promise.all(checks.map((check) => check.count()));

  return checks
    .map((check, index) => ({ check, count: counts[index] }))
    .filter(({ count }) => count > 0)
    .map(({ check, count }) => ({
      id: check.id,
      count,
      label: count === 1 ? check.singular : check.plural,
      description: check.description,
      severity: check.severity,
    }))
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "serious" ? -1 : 1;
      return b.count - a.count;
    });
}

export type HealthDetail = {
  id: string;
  label: string;
  description: string;
  severity: HealthSeverity;
  fixHref: string;
  fixLabel: string;
  rows: HealthRow[];
  /** True om listan kapades av gränsen och alltså inte är komplett. */
  truncated: boolean;
};

/**
 * Detaljvyn för en enskild kontroll: vilka poster det faktiskt gäller.
 * Returnerar null för ett id som inte finns, så sidan kan svara 404.
 */
export async function getHealthDetail(
  id: string,
): Promise<HealthDetail | null> {
  const check = checks.find((candidate) => candidate.id === id);
  if (!check) return null;

  const rows = await check.list();

  return {
    id: check.id,
    label: rows.length === 1 ? check.singular : check.plural,
    description: check.description,
    severity: check.severity,
    fixHref: check.fixHref,
    fixLabel: check.fixLabel,
    rows,
    truncated: rows.length >= HEALTH_ROW_LIMIT,
  };
}
