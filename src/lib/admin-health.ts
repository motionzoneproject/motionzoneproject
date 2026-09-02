// Felsökningskontroller för adminöversikten: sådant som är tyst trasigt i
// datan, alltså inte kraschar men gör att något beter sig fel för kunden.
//
// Ligger medvetet utanför en "use server"-fil — se admin-overview.ts. Kör bara
// från /admin, som redan vaktat att användaren är admin.

import prisma from "./prisma";

export type HealthSeverity = "warning" | "serious";

export type HealthIssue = {
  id: string;
  count: number;
  label: string;
  /** Varför det spelar roll — annars går det inte att prioritera. */
  description: string;
  href: string;
  severity: HealthSeverity;
};

type Check = {
  id: string;
  singular: string;
  plural: string;
  description: string;
  href: string;
  severity: HealthSeverity;
  count: () => Promise<number>;
};

const checks: Check[] = [
  {
    id: "product-without-course",
    singular: "aktiv produkt utan kurser",
    plural: "aktiva produkter utan kurser",
    description: "Går att köpa men ger inte tillgång till någonting.",
    href: "/admin/products",
    severity: "serious",
    count: () =>
      prisma.product.count({ where: { active: true, courses: { none: {} } } }),
  },
  {
    id: "course-without-schema",
    singular: "aktiv kurs utan schemapost",
    plural: "aktiva kurser utan schemaposter",
    description: "Utan veckoschema skapas inga lektioner att boka.",
    href: "/admin/termin",
    severity: "warning",
    count: () =>
      prisma.course.count({
        where: { active: true, schemaItems: { none: {} } },
      }),
  },
  {
    id: "course-without-product",
    singular: "aktiv kurs ingår inte i någon produkt",
    plural: "aktiva kurser ingår inte i någon produkt",
    description: "Kursen finns men går inte att köpa sig till.",
    href: "/admin/products",
    severity: "warning",
    count: () =>
      prisma.course.count({ where: { active: true, products: { none: {} } } }),
  },
  {
    id: "schema-without-studio",
    singular: "schemapost saknar sal",
    plural: "schemaposter saknar sal",
    description: "Lektionerna visas utan plats för eleverna.",
    href: "/admin/termin",
    severity: "warning",
    count: () => prisma.schemaItem.count({ where: { studioId: null } }),
  },
  {
    id: "booking-on-cancelled",
    singular: "bokning ligger kvar på en inställd lektion",
    plural: "bokningar ligger kvar på inställda lektioner",
    description:
      "Klippen borde ha återförts när lektionen ställdes in. Eleven har blivit av med ett tillfälle.",
    href: "/admin/lectures?status=cancelled",
    severity: "serious",
    count: () =>
      prisma.booking.count({
        where: { cancelled: false, lesson: { cancelled: true } },
      }),
  },
  {
    id: "negative-balance",
    singular: "köp har negativt saldo",
    plural: "köp har negativt saldo",
    description: "Fler tillfällen har dragits än som fanns. Bokföringsfel.",
    href: "/admin/students",
    severity: "serious",
    count: async () => {
      const [items, purchases] = await Promise.all([
        prisma.purchaseItem.count({ where: { remainingCount: { lt: 0 } } }),
        prisma.purchase.count({ where: { remainingCount: { lt: 0 } } }),
      ]);
      return items + purchases;
    },
  },
  {
    id: "teacher-without-role",
    singular: "aktiv kurs har en lärare utan lärarbehörighet",
    plural: "aktiva kurser har lärare utan lärarbehörighet",
    description:
      "Läraren kan inte logga in och hantera sina lektioner, och försvinner ur lärarlistorna.",
    href: "/admin/users",
    severity: "warning",
    count: () =>
      prisma.course.count({
        where: {
          active: true,
          teacher: { role: { notIn: ["admin", "teacher"] } },
        },
      }),
  },
  {
    id: "teacher-without-profile",
    singular: "lärare saknar lärarprofil",
    plural: "lärare saknar lärarprofil",
    description: "Syns inte på den publika presentationssidan.",
    href: "/admin/teachers",
    severity: "warning",
    count: () =>
      prisma.user.count({
        where: {
          teacherProfile: null,
          teachingCourses: { some: { active: true } },
        },
      }),
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
      href: check.href,
      severity: check.severity,
    }))
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "serious" ? -1 : 1;
      return b.count - a.count;
    });
}
