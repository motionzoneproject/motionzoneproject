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

/** En av flera dubbletter av samma deltagare, med allt admin behöver för att välja vilken som ska överleva. */
export type ParticipantCopy = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  allowPhotoVideo: boolean;
  orderItems: number;
  purchases: number;
  createdAt: Date;
};

/**
 * Vad som går att göra åt en enskild rad. Bara problem med ett entydigt,
 * återställbart ingrepp får en fix — resten kräver ett mänskligt beslut
 * (vilken sal? vilken produkt?) och länkar i stället till rätt sida.
 */
export type HealthFix =
  | { kind: "participant-merge"; copies: ParticipantCopy[] }
  | { kind: "teacher-role"; userId: string; userName: string; courses: number };

export type HealthRow = {
  id: string;
  title: string;
  detail?: string;
  fix?: HealthFix;
};

export type HealthIssue = {
  id: string;
  count: number;
  label: string;
  /** Varför det spelar roll — annars går det inte att prioritera. */
  description: string;
  severity: HealthSeverity;
  /**
   * Raderna som går att åtgärda direkt, så knappen finns redan i översikten
   * och man slipper klicka sig vidare för att laga något. Tom för kontroller
   * vars fix kräver ett mänskligt beslut.
   */
  fixes: HealthRow[];
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
  /**
   * Sant om list() ger rader med en fix. Styr om översikten ska hämta dem
   * direkt — utan flaggan skulle alla nitton kontroller behöva listas för
   * att ta reda på att de flesta inte har någon knapp.
   */
  fixable?: boolean;
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

const teacherMissingRole = {
  role: { notIn: ["admin", "teacher"] },
  teachingCourses: { some: { active: true } },
} satisfies Prisma.UserWhereInput;

const teacherWithoutProfile = {
  teacherProfile: null,
  teachingCourses: { some: { active: true } },
} satisfies Prisma.UserWhereInput;

/** En produkt utan platser och utan "obegränsat" kan aldrig säljas. */
const productWithoutCapacity = {
  active: true,
  unlimitedCustomers: false,
  maxCustomer: 0,
} satisfies Prisma.ProductWhereInput;

const lessonWithoutTermin = {
  terminId: null,
} satisfies Prisma.LessonWhereInput;

/** Så länge har en kund fått vänta innan det räknas som glömt. */
const STALE_ORDER_DAYS = 14;

const staleOrderCutoff = () =>
  new Date(Date.now() - STALE_ORDER_DAYS * 24 * 60 * 60 * 1000);

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
    singular: "lärare undervisar utan lärarbehörighet",
    plural: "lärare undervisar utan lärarbehörighet",
    description:
      "Kan inte logga in och hantera sina lektioner, och försvinner ur lärarlistorna.",
    fixHref: "/admin/users",
    fixLabel: "Till användare",
    severity: "warning",
    fixable: true,
    // Grupperat per lärare, inte per kurs: en lärare med fyra kurser är ett
    // problem att åtgärda, inte fyra.
    count: () => prisma.user.count({ where: teacherMissingRole }),
    list: async () => {
      const rows = await prisma.user.findMany({
        where: teacherMissingRole,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          _count: { select: { teachingCourses: { where: { active: true } } } },
        },
        orderBy: { name: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: `${row.email} · har rollen "${row.role ?? "ingen"}" · undervisar ${row._count.teachingCourses} aktiva kurser`,
        fix: {
          kind: "teacher-role" as const,
          userId: row.id,
          userName: row.name,
          courses: row._count.teachingCourses,
        },
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

  // ---- Kunden har betalat men inte fått det hon köpte ----

  {
    id: "order-approved-without-purchase",
    singular: "beviljad order saknar köp",
    plural: "beviljade ordrar saknar köp",
    description:
      "Ordern godkändes men createPurchaseFromOrder skapade aldrig något köp. Kunden har betalat och fått noll tillgång.",
    fixHref: "/admin/orders?status=APPROVED",
    fixLabel: "Till beviljade ordrar",
    severity: "serious",
    count: () =>
      prisma.order.count({
        where: { status: "APPROVED", purchases: { none: {} } },
      }),
    list: async () => {
      const rows = await prisma.order.findMany({
        where: { status: "APPROVED", purchases: { none: {} } },
        select: {
          id: true,
          createdAt: true,
          totalPrice: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.user.name,
        detail: `${formatPrice(row.totalPrice)} · ${formatShortFriendlyDate(row.createdAt)} · ${row.user.email}`,
      }));
    },
  },
  {
    id: "purchase-without-items",
    singular: "köp saknar kurstillgång",
    plural: "köp saknar kurstillgång",
    description:
      "Köpet finns men har inga purchaseItems, så kunden kan inte boka någonting på det.",
    fixHref: "/admin/students",
    fixLabel: "Till elever",
    severity: "serious",
    count: () =>
      prisma.purchase.count({ where: { PurchaseItems: { none: {} } } }),
    list: async () => {
      const rows = await prisma.purchase.findMany({
        where: { PurchaseItems: { none: {} } },
        select: {
          id: true,
          user: { select: { name: true, email: true } },
          product: { select: { name: true } },
        },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.user.name,
        detail: `${row.product.name} · ${row.user.email}`,
      }));
    },
  },
  {
    id: "order-with-courseless-product",
    singular: "order innehåller en produkt utan kurser",
    plural: "ordrar innehåller produkter utan kurser",
    description:
      "Kunden har köpt något som inte ger tillgång till någon kurs. Åtgärda produkten, inte bara ordern.",
    fixHref: "/admin/products",
    fixLabel: "Till produkter",
    severity: "serious",
    count: () =>
      prisma.order.count({
        where: {
          status: { not: "CANCELLED" },
          orderItems: { some: { product: { courses: { none: {} } } } },
        },
      }),
    list: async () => {
      const rows = await prisma.order.findMany({
        where: {
          status: { not: "CANCELLED" },
          orderItems: { some: { product: { courses: { none: {} } } } },
        },
        select: {
          id: true,
          createdAt: true,
          user: { select: { name: true } },
          orderItems: {
            where: { product: { courses: { none: {} } } },
            select: { product: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.user.name,
        detail: `${row.orderItems.map((item) => item.product.name).join(", ")} · ${formatShortFriendlyDate(row.createdAt)}`,
      }));
    },
  },

  // ---- Bokningar som inte stämmer med vad som köpts ----

  {
    id: "booking-course-mismatch",
    singular: "bokning gäller en annan kurs än den köpta",
    plural: "bokningar gäller andra kurser än de köpta",
    description:
      "Bokningens purchaseItem pekar på en annan kurs än lektionen tillhör. Klipp har dragits från fel kurs.",
    fixHref: "/admin/lectures",
    fixLabel: "Till lektioner",
    severity: "serious",
    count: async () => {
      const rows = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n
        FROM "Booking" b
        JOIN "lesson" l ON l.id = b."lessonId"
        JOIN "purchase_item" pi ON pi.id = b."purchaseItemId"
        WHERE b.cancelled = false AND pi."courseId" <> l."courseId"
      `;
      return Number(rows[0]?.n ?? 0);
    },
    list: async () => {
      const rows = await prisma.$queryRaw<
        {
          id: string;
          studentName: string;
          lessonCourse: string;
          itemCourse: string;
          startTime: Date;
        }[]
      >`
        SELECT b.id, u.name AS "studentName",
               lc.name AS "lessonCourse", ic.name AS "itemCourse",
               l."startTime"
        FROM "Booking" b
        JOIN "lesson" l ON l.id = b."lessonId"
        JOIN "purchase_item" pi ON pi.id = b."purchaseItemId"
        JOIN "course" lc ON lc.id = l."courseId"
        JOIN "course" ic ON ic.id = pi."courseId"
        JOIN "user" u ON u.id = b."userId"
        WHERE b.cancelled = false AND pi."courseId" <> l."courseId"
        ORDER BY l."startTime" DESC
        LIMIT ${take}
      `;
      return rows.map((row) => ({
        id: row.id,
        title: row.studentName,
        detail: `Bokad på "${row.lessonCourse}" ${formatShortFriendlyDate(row.startTime)}, men klippet gäller "${row.itemCourse}"`,
      }));
    },
  },
  {
    id: "duplicate-booking",
    singular: "lektion har samma köp bokat flera gånger",
    plural: "lektioner har samma köp bokat flera gånger",
    description:
      "Samma purchaseItem är bokat mer än en gång på samma lektion, så fler klipp har dragits än platser tagits.",
    fixHref: "/admin/lectures",
    fixLabel: "Till lektioner",
    severity: "serious",
    count: async () => {
      const rows = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM (
          SELECT 1 FROM "Booking"
          WHERE cancelled = false
          GROUP BY "lessonId", "purchaseItemId"
          HAVING COUNT(*) > 1
        ) dupes
      `;
      return Number(rows[0]?.n ?? 0);
    },
    list: async () => {
      const rows = await prisma.$queryRaw<
        {
          lessonId: string;
          studentName: string;
          courseName: string;
          startTime: Date;
          n: bigint;
        }[]
      >`
        SELECT b."lessonId", u.name AS "studentName", c.name AS "courseName",
               l."startTime", COUNT(*)::bigint AS n
        FROM "Booking" b
        JOIN "lesson" l ON l.id = b."lessonId"
        JOIN "course" c ON c.id = l."courseId"
        JOIN "user" u ON u.id = b."userId"
        WHERE b.cancelled = false
        GROUP BY b."lessonId", b."purchaseItemId", u.name, c.name, l."startTime"
        HAVING COUNT(*) > 1
        ORDER BY l."startTime" DESC
        LIMIT ${take}
      `;
      return rows.map((row) => ({
        id: `${row.lessonId}-${row.studentName}`,
        title: row.studentName,
        detail: `${row.courseName} · ${formatShortFriendlyDate(row.startTime)} · bokad ${row.n} gånger`,
      }));
    },
  },

  // ---- Deltagare ----

  {
    id: "duplicate-participant",
    singular: "deltagare är inlagd flera gånger",
    plural: "deltagare är inlagda flera gånger",
    description:
      "Samma namn finns som flera separata deltagare hos samma användare. Bokningar och närvaro splittras då mellan dubbletterna.",
    fixHref: "/admin/students",
    fixLabel: "Till elever",
    severity: "warning",
    fixable: true,
    count: async () => {
      const rows = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM (
          SELECT 1 FROM "participant"
          GROUP BY "addedByUserId", lower(btrim(name))
          HAVING COUNT(*) > 1
        ) dupes
      `;
      return Number(rows[0]?.n ?? 0);
    },
    list: async () => {
      // Grupperna först — vilka (ägare, normaliserat namn) som har dubbletter
      // och vilka id:n som ingår. array_agg ger oss id:na direkt.
      const groups = await prisma.$queryRaw<
        { userName: string; ids: string[] }[]
      >`
        SELECT u.name AS "userName", array_agg(p.id) AS ids
        FROM "participant" p
        JOIN "user" u ON u.id = p."addedByUserId"
        GROUP BY u.name, p."addedByUserId", lower(btrim(p.name))
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT ${take}
      `;

      if (groups.length === 0) return [];

      // Sedan detaljerna för alla inblandade i en enda fråga, så dialogen
      // kan visa vad varje kopia faktiskt bär på.
      const details = await prisma.participant.findMany({
        where: { id: { in: groups.flatMap((group) => group.ids) } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          allowPhotoVideo: true,
          createdAt: true,
          _count: { select: { orderItems: true, purchases: true } },
        },
      });

      const byId = new Map(details.map((row) => [row.id, row]));

      return groups.flatMap((group) => {
        const copies: ParticipantCopy[] = group.ids
          .map((id) => byId.get(id))
          .filter((row) => row !== undefined)
          .map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            dateOfBirth: row.dateOfBirth,
            allowPhotoVideo: row.allowPhotoVideo,
            orderItems: row._count.orderItems,
            purchases: row._count.purchases,
            createdAt: row.createdAt,
          }))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        if (copies.length < 2) return [];

        const linked = copies.reduce(
          (sum, copy) => sum + copy.orderItems + copy.purchases,
          0,
        );

        return [
          {
            id: copies[0].id,
            title: copies[0].name,
            detail: `${copies.length} kopior tillagda av ${group.userName} · ${linked} kopplade ordrar/köp`,
            fix: { kind: "participant-merge" as const, copies },
          },
        ];
      });
    },
  },

  // ---- Produkter och terminer som inte beter sig som avsett ----

  {
    id: "product-without-capacity",
    singular: "aktiv produkt har noll platser",
    plural: "aktiva produkter har noll platser",
    description:
      "maxCustomer är 0 utan att produkten är obegränsad, så den visar alltid slutsåld och går aldrig att köpa.",
    fixHref: "/admin/products",
    fixLabel: "Till produkter",
    severity: "serious",
    count: () => prisma.product.count({ where: productWithoutCapacity }),
    list: async () => {
      const rows = await prisma.product.findMany({
        where: productWithoutCapacity,
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
    id: "order-waiting-long",
    singular: "order har väntat länge på godkännande",
    plural: "ordrar har väntat länge på godkännande",
    description: `Äldre än ${STALE_ORDER_DAYS} dagar och fortfarande obeslutade. Kunden väntar.`,
    fixHref: "/admin/orders?status=PENDING",
    fixLabel: "Till väntande ordrar",
    severity: "warning",
    count: () =>
      prisma.order.count({
        where: {
          status: "AWAITING_APPROVAL",
          createdAt: { lt: staleOrderCutoff() },
        },
      }),
    list: async () => {
      const rows = await prisma.order.findMany({
        where: {
          status: "AWAITING_APPROVAL",
          createdAt: { lt: staleOrderCutoff() },
        },
        select: {
          id: true,
          createdAt: true,
          totalPrice: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.user.name,
        detail: `${formatPrice(row.totalPrice)} · beställd ${formatShortFriendlyDate(row.createdAt)} · ${row.user.email}`,
      }));
    },
  },
  {
    id: "termin-ended-still-active",
    singular: "termin är aktiv men har passerat sitt slutdatum",
    plural: "terminer är aktiva men har passerat sitt slutdatum",
    description:
      "Kurser och produkter i terminen kan fortfarande visas och säljas till kunder.",
    fixHref: "/admin/termin",
    fixLabel: "Till terminer",
    severity: "warning",
    count: () =>
      prisma.termin.count({
        where: { active: true, endDate: { lt: new Date() } },
      }),
    list: async () => {
      const rows = await prisma.termin.findMany({
        where: { active: true, endDate: { lt: new Date() } },
        select: { id: true, name: true, endDate: true },
        orderBy: { endDate: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: `Slutade ${formatShortFriendlyDate(row.endDate)}`,
      }));
    },
  },
  {
    id: "product-expired-still-active",
    singular: "aktiv produkt har passerat sitt sista datum",
    plural: "aktiva produkter har passerat sitt sista datum",
    description: "Ligger kvar som köpbar trots att giltigheten gått ut.",
    fixHref: "/admin/products",
    fixLabel: "Till produkter",
    severity: "warning",
    count: () =>
      prisma.product.count({
        where: { active: true, expireFixedDate: { lt: new Date() } },
      }),
    list: async () => {
      const rows = await prisma.product.findMany({
        where: { active: true, expireFixedDate: { lt: new Date() } },
        select: { id: true, name: true, expireFixedDate: true },
        orderBy: { expireFixedDate: "asc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: row.expireFixedDate
          ? `Gick ut ${formatShortFriendlyDate(row.expireFixedDate)}`
          : undefined,
      }));
    },
  },
  {
    id: "lesson-without-termin",
    singular: "lektion saknar termin",
    plural: "lektioner saknar termin",
    description:
      "Faller ur alla terminsfilter och räknas inte med i statistiken.",
    fixHref: "/admin/lectures",
    fixLabel: "Till lektioner",
    severity: "warning",
    count: () => prisma.lesson.count({ where: lessonWithoutTermin }),
    list: async () => {
      const rows = await prisma.lesson.findMany({
        where: lessonWithoutTermin,
        select: {
          id: true,
          startTime: true,
          course: { select: { name: true } },
        },
        orderBy: { startTime: "desc" },
        take,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.course.name,
        detail: formatShortFriendlyDate(row.startTime),
      }));
    },
  },
];

/** Vad en kontroll letar efter — underlag till "Vad testas?"-dialogen. */
export type HealthCheckInfo = {
  id: string;
  label: string;
  description: string;
  severity: HealthSeverity;
};

/**
 * Alla kontroller, oavsett om de slår till. Används för att förklara vad
 * felsökningen faktiskt tittar på, så en tom lista går att lita på.
 */
export function getHealthCheckInfo(): HealthCheckInfo[] {
  return checks.map((check) => ({
    id: check.id,
    label: check.plural,
    description: check.description,
    severity: check.severity,
  }));
}

/**
 * Kör alla kontroller och returnerar bara de som faktiskt slår till,
 * allvarligast först.
 */
export async function getHealthIssues(): Promise<HealthIssue[]> {
  const counts = await Promise.all(checks.map((check) => check.count()));

  const hits = checks
    .map((check, index) => ({ check, count: counts[index] }))
    .filter(({ count }) => count > 0);

  // Bara de åtgärdbara kontrollerna listas här, och bara när de faktiskt slår
  // till — resten av raderna hämtas först på detaljsidan.
  const fixLists = await Promise.all(
    hits.map(({ check }) =>
      check.fixable ? check.list() : Promise.resolve([]),
    ),
  );

  return hits
    .map(({ check, count }, index) => ({
      id: check.id,
      count,
      label: count === 1 ? check.singular : check.plural,
      description: check.description,
      severity: check.severity,
      fixes: fixLists[index].filter((row) => row.fix !== undefined),
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
