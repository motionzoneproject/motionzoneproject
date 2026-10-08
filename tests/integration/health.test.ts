// Felkontrollen på /admin: varje kontroll ska ge noll på frisk data, hitta
// exakt det fel den letar efter, och — där det finns en åtgärd — bli noll
// igen när åtgärden körts. Åtgärderna är server actions och därmed publika
// endpoints, så de ska vägra allt utom admin.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  backfillPurchaseItems,
  createMissingPurchase,
  disableProductAutobook,
  grantTeacherRole,
  mergeParticipants,
  removeStaleBooking,
  runHealthChecks,
} from "@/lib/actions/health-actions";
import { approveOrder } from "@/lib/actions/orders";
import { setCourseBooking } from "@/lib/actions/schedule-actions";
import {
  getHealthCheckInfo,
  getHealthDetail,
  type HealthFix,
} from "@/lib/admin-health";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  bookingsFor,
  buy,
  createCourse,
  createParticipant,
  createProduct,
  createUser,
  futureBookingCount,
  placeOrder,
} from "../helpers/factories";
import {
  countQueries,
  createHealthyCourse,
  createTeacher,
  detailRows,
  issueCount,
  issueCounts,
  resetDb,
} from "../helpers/health";
import { actAs } from "../helpers/session";

type User = Awaited<ReturnType<typeof createUser>>;

const DAY = 24 * 60 * 60 * 1000;

let admin: User;
let teacher: User;

beforeEach(async () => {
  await resetDb();
  admin = await createUser({ role: "admin" });
  teacher = await createTeacher();
  actAs({ id: admin.id, role: "admin" });
});

function fixOf<K extends HealthFix["kind"]>(
  row: { fix?: HealthFix } | undefined,
  kind: K,
): Extract<HealthFix, { kind: K }> {
  expect(row?.fix?.kind).toBe(kind);
  return row?.fix as Extract<HealthFix, { kind: K }>;
}

/** En frisk kurs med en autobokande kursprodukt. */
async function courseWithProduct(
  opts: { autobook?: boolean; past?: number; future?: number } = {},
) {
  const course = await createHealthyCourse({
    teacher,
    past: opts.past ?? 0,
    future: opts.future ?? 4,
  });
  const product = await createProduct({
    type: "COURSE",
    courses: [course],
    lessonsIncluded: 10,
    autobook: opts.autobook ?? true,
  });
  return { course, product };
}

const CHECK_IDS = getHealthCheckInfo().map((check) => check.id);

describe("ren databas", () => {
  it("ger inga träffar alls", async () => {
    expect(await issueCounts()).toEqual({});
  });

  it.each(CHECK_IDS)("%s: detaljvyn är tom", async (id) => {
    const detail = await getHealthDetail(id);
    expect(detail).not.toBeNull();
    expect(detail?.rows).toEqual([]);
    expect(detail?.truncated).toBe(false);
  });

  it("frisk data med köp och autobokning ger inga träffar", async () => {
    const { product } = await courseWithProduct();
    const pack1 = await createHealthyCourse({ teacher, future: 3 });
    const pack2 = await createHealthyCourse({ teacher, future: 3 });
    const pack = await createProduct({
      type: "PACK",
      courses: [pack1, pack2],
      autobook: false,
    });
    const buyer = await createUser();
    const child = await createParticipant(buyer);

    await buy({ admin, buyer, product });
    await buy({ admin, buyer, product: pack, participant: child });

    expect(await issueCounts()).toEqual({});
  });

  it("okänt kontroll-id ger null (404)", async () => {
    expect(await getHealthDetail("finns-inte")).toBeNull();
  });

  it("kontrollernas id:n är unika", () => {
    expect(new Set(CHECK_IDS).size).toBe(CHECK_IDS.length);
  });
});

describe("product-without-course", () => {
  it("hittar en aktiv produkt utan kurser, inte en inaktiv", async () => {
    const product = await createProduct({ type: "COURSE", courses: [] });
    const inactive = await createProduct({ type: "COURSE", courses: [] });
    await prisma.product.update({
      where: { id: inactive.id },
      data: { active: false },
    });

    expect(await issueCounts()).toEqual({ "product-without-course": 1 });
    const rows = await detailRows("product-without-course");
    expect(rows.map((r) => r.id)).toEqual([product.id]);

    // Lagas för hand: kurser läggs till i produkten.
    const { course } = await courseWithProduct();
    await prisma.productOnCourse.create({
      data: { productId: product.id, courseId: course.id, lessonsIncluded: 5 },
    });
    expect(await issueCount("product-without-course")).toBe(0);
  });
});

describe("course-without-schema", () => {
  it("hittar en aktiv kurs utan schemapost", async () => {
    const course = await prisma.course.create({
      data: { name: "utan-schema", description: "x", teacherId: teacher.id },
    });
    await createProduct({ type: "COURSE", courses: [course] });

    expect(await issueCounts()).toEqual({ "course-without-schema": 1 });
    expect(
      (await detailRows("course-without-schema")).map((r) => r.id),
    ).toEqual([course.id]);

    await prisma.course.update({
      where: { id: course.id },
      data: { active: false },
    });
    expect(await issueCount("course-without-schema")).toBe(0);
  });
});

describe("course-without-product", () => {
  it("hittar en aktiv kurs som inte ingår i någon produkt", async () => {
    const course = await createHealthyCourse({ teacher });

    expect(await issueCounts()).toEqual({ "course-without-product": 1 });
    expect(
      (await detailRows("course-without-product")).map((r) => r.id),
    ).toEqual([course.id]);

    await createProduct({ type: "COURSE", courses: [course] });
    expect(await issueCount("course-without-product")).toBe(0);
  });
});

describe("schema-without-studio", () => {
  it("hittar en schemapost utan sal", async () => {
    const course = await createCourse({ teacher });
    await createProduct({ type: "COURSE", courses: [course] });
    const schema = await prisma.schemaItem.findFirstOrThrow({
      where: { courseId: course.id },
    });

    expect(await issueCounts()).toEqual({ "schema-without-studio": 1 });
    expect(
      (await detailRows("schema-without-studio")).map((r) => r.id),
    ).toEqual([schema.id]);

    const studio = await prisma.studio.create({
      data: { name: "Sal B", description: "x" },
    });
    await prisma.schemaItem.update({
      where: { id: schema.id },
      data: { studioId: studio.id },
    });
    expect(await issueCount("schema-without-studio")).toBe(0);
  });
});

describe("booking-on-cancelled", () => {
  it("hittar bokningen, och åtgärden tar bort den och lägger tillbaka klippet", async () => {
    const { product } = await courseWithProduct();
    const { items } = await buy({ admin, buyer: await createUser(), product });
    const item = items[0];
    const [first] = await bookingsFor(item.id);
    await prisma.lesson.update({
      where: { id: first.lessonId },
      data: { cancelled: true },
    });

    expect(await issueCounts()).toEqual({ "booking-on-cancelled": 1 });
    const rows = await detailRows("booking-on-cancelled");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(first.id);
    const fix = fixOf(rows[0], "booking-remove");
    expect(fix).toMatchObject({
      lessonId: first.lessonId,
      purchaseItemId: item.id,
      reason: "cancelled",
      removes: 1,
    });

    // Översikten har knappen direkt.
    const issue = (await runHealthChecks()) as {
      success: true;
      issues: { id: string; fixes: unknown[] }[];
    };
    expect(
      issue.issues.find((i) => i.id === "booking-on-cancelled")?.fixes,
    ).toHaveLength(1);

    const before = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    const result = await removeStaleBooking(
      fix.lessonId,
      fix.purchaseItemId,
      fix.reason,
    );
    expect(result.success).toBe(true);

    expect(await issueCount("booking-on-cancelled")).toBe(0);
    const after = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.remainingCount).toBe(before.remainingCount + 1);
    expect(await bookingsFor(item.id)).toHaveLength(3);
  });

  it("åtgärden vägrar om lektionen inte längre är inställd", async () => {
    const { product } = await courseWithProduct();
    const { items } = await buy({ admin, buyer: await createUser(), product });
    const [first] = await bookingsFor(items[0].id);

    const result = await removeStaleBooking(
      first.lessonId,
      items[0].id,
      "cancelled",
    );
    expect(result.success).toBe(false);
    expect(await bookingsFor(items[0].id)).toHaveLength(4);
  });
});

describe("negative-balance", () => {
  it("räknar både kursrader och klippkort med negativt saldo", async () => {
    const { product } = await courseWithProduct();
    const { items } = await buy({ admin, buyer: await createUser(), product });
    await prisma.purchaseItem.update({
      where: { id: items[0].id },
      data: { remainingCount: -2 },
    });

    expect(await issueCounts()).toEqual({ "negative-balance": 1 });

    const clipCourse = await createHealthyCourse({ teacher });
    const clip = await createProduct({
      type: "CLIP",
      courses: [clipCourse, (await courseWithProduct()).course],
      totalCount: 5,
    });
    const { purchase } = await buy({
      admin,
      buyer: await createUser(),
      product: clip,
    });
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { remainingCount: -1 },
    });

    expect(await issueCount("negative-balance")).toBe(2);
    expect(
      (await detailRows("negative-balance")).map((r) => r.id).sort(),
    ).toEqual([`item-${items[0].id}`, `purchase-${purchase.id}`].sort());

    await prisma.purchaseItem.update({
      where: { id: items[0].id },
      data: { remainingCount: 0 },
    });
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { remainingCount: 0 },
    });
    expect(await issueCount("negative-balance")).toBe(0);
  });
});

describe("teacher-without-role", () => {
  it("hittar läraren, och grantTeacherRole ger rollen", async () => {
    const plain = await createUser({ role: "user" });
    await prisma.teacherProfile.create({
      data: {
        name: "x",
        specialty: "x",
        description: "x",
        userId: plain.id,
      },
    });
    const course = await createHealthyCourse({ teacher: plain });
    await createProduct({ type: "COURSE", courses: [course] });

    expect(await issueCounts()).toEqual({ "teacher-without-role": 1 });
    const rows = await detailRows("teacher-without-role");
    expect(rows.map((r) => r.id)).toEqual([plain.id]);
    const fix = fixOf(rows[0], "teacher-role");
    expect(fix.courses).toBe(1);

    // adminSetRole går via better-auths setRole, som läser admins session
    // ur cookien. Testerna har ingen riktig cookie (next/headers är mockad),
    // så endpointen ersätts med det den gör: sätter rollen i databasen.
    const setRole = vi
      .spyOn(auth.api, "setRole")
      .mockImplementation((async (ctx: {
        body: { userId: string; role: string };
      }) => {
        await prisma.user.update({
          where: { id: ctx.body.userId },
          data: { role: ctx.body.role },
        });
        return { user: null };
      }) as unknown as typeof auth.api.setRole);

    const result = await grantTeacherRole(fix.userId);
    expect(setRole).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { userId: plain.id, role: "teacher" },
      }),
    );
    setRole.mockRestore();
    expect(result).toMatchObject({ success: true });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: plain.id },
    });
    expect(user.role).toBe("teacher");
    expect(await issueCount("teacher-without-role")).toBe(0);
  });

  it("grantTeacherRole vägrar den som inte undervisar", async () => {
    const plain = await createUser({ role: "user" });
    const result = await grantTeacherRole(plain.id);
    expect(result.success).toBe(false);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: plain.id },
    });
    expect(user.role).toBe("user");
  });

  it("grantTeacherRole degraderar aldrig en admin", async () => {
    await createHealthyCourse({ teacher: admin });
    const result = await grantTeacherRole(admin.id);
    expect(result.success).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: admin.id },
    });
    expect(user.role).toBe("admin");
  });
});

describe("teacher-without-profile", () => {
  it("hittar en lärare utan profil", async () => {
    const bare = await createUser({ role: "teacher" });
    const course = await createHealthyCourse({ teacher: bare });
    await createProduct({ type: "COURSE", courses: [course] });

    expect(await issueCounts()).toEqual({ "teacher-without-profile": 1 });
    expect(
      (await detailRows("teacher-without-profile")).map((r) => r.id),
    ).toEqual([bare.id]);

    await prisma.teacherProfile.create({
      data: { name: "x", specialty: "x", description: "x", userId: bare.id },
    });
    expect(await issueCount("teacher-without-profile")).toBe(0);
  });
});

describe("order-approved-without-purchase", () => {
  it("hittar ordern, och createMissingPurchase skapar köpet med autobokning", async () => {
    const { product } = await courseWithProduct();
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });
    await approveOrder(order.id);

    expect(await issueCounts()).toEqual({
      "order-approved-without-purchase": 1,
    });
    const rows = await detailRows("order-approved-without-purchase");
    expect(rows.map((r) => r.id)).toEqual([order.id]);
    const fix = fixOf(rows[0], "order-purchase");
    expect(fix.missingSelections).toEqual([]);
    expect(fix.productNames).toEqual([product.name]);

    const result = await createMissingPurchase(fix.orderId);
    expect(result.success).toBe(true);

    expect(await issueCounts()).toEqual({});
    const purchase = await prisma.purchase.findFirstOrThrow({
      where: { orderId: order.id },
      include: { PurchaseItems: true },
    });
    expect(purchase.PurchaseItems).toHaveLength(1);
    expect(await futureBookingCount(purchase.PurchaseItems[0].id)).toBe(4);

    // Andra gången finns köpet redan.
    const again = await createMissingPurchase(order.id);
    expect(again.success).toBe(false);
    expect(await prisma.purchase.count({ where: { orderId: order.id } })).toBe(
      1,
    );
  });

  it("createMissingPurchase vägrar en order som inte är beviljad", async () => {
    const { product } = await courseWithProduct();
    const order = await placeOrder({ buyer: await createUser(), product });
    const result = await createMissingPurchase(order.id);
    expect(result.success).toBe(false);
    expect(await prisma.purchase.count()).toBe(0);
  });
});

describe("purchase-without-items", () => {
  async function packPurchase() {
    const a = await createHealthyCourse({ teacher });
    const b = await createHealthyCourse({ teacher });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      lessonsIncluded: 7,
      autobook: false,
    });
    const bought = await buy({ admin, buyer: await createUser(), product });
    return { ...bought, product, courses: [a, b] };
  }

  it("hittar köpet, och backfillPurchaseItems återskapar raderna", async () => {
    const { purchase, courses } = await packPurchase();
    await prisma.purchaseItem.deleteMany({
      where: { purchaseId: purchase.id },
    });

    expect(await issueCounts()).toEqual({ "purchase-without-items": 1 });
    const rows = await detailRows("purchase-without-items");
    expect(rows.map((r) => r.id)).toEqual([purchase.id]);
    const fix = fixOf(rows[0], "purchase-backfill");
    expect(fix.courseNames).toHaveLength(2);

    const result = await backfillPurchaseItems(fix.purchaseId);
    expect(result.success).toBe(true);

    expect(await issueCounts()).toEqual({});
    const items = await prisma.purchaseItem.findMany({
      where: { purchaseId: purchase.id },
    });
    expect(items.map((i) => i.courseId).sort()).toEqual(
      courses.map((c) => c.id).sort(),
    );
    for (const item of items) {
      expect(item.lessonsIncluded).toBe(7);
      expect(item.remainingCount).toBe(7);
    }

    // En andra körning gör ingenting.
    expect((await backfillPurchaseItems(purchase.id)).success).toBe(false);
  });

  it("backfill vägrar när produkten saknar kurser", async () => {
    const product = await createProduct({ type: "COURSE", courses: [] });
    const { purchase } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    const rows = await detailRows("purchase-without-items");
    expect(fixOf(rows[0], "purchase-backfill").courseNames).toEqual([]);

    const result = await backfillPurchaseItems(purchase.id);
    expect(result.success).toBe(false);
    expect(await issueCount("purchase-without-items")).toBe(1);
  });
});

describe("product-autobooks-everything", () => {
  it("hittar ett autobokande paket med fler än två kurser, och åtgärden stänger av autobokningen", async () => {
    const courses = [
      await createHealthyCourse({ teacher }),
      await createHealthyCourse({ teacher }),
      await createHealthyCourse({ teacher }),
    ];
    const product = await createProduct({
      type: "PACK",
      courses,
      autobook: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    expect(items).toHaveLength(3);

    expect(await issueCounts()).toEqual({ "product-autobooks-everything": 1 });
    const rows = await detailRows("product-autobooks-everything");
    expect(rows.map((r) => r.id)).toEqual([product.id]);
    const fix = fixOf(rows[0], "product-autobook");
    expect(fix.courseCount).toBe(3);
    expect(fix.affected).toHaveLength(1);
    expect(fix.affected[0].courses).toBe(3);

    const result = await disableProductAutobook(fix.productId);
    expect(result.success).toBe(true);
    expect(await issueCount("product-autobooks-everything")).toBe(0);
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(after.autobook).toBe(false);
    // Bokningarna rörs inte.
    for (const item of items) {
      expect(await futureBookingCount(item.id)).toBe(4);
    }
  });

  it("två kurser, klippkort och paket med kursbegränsning räknas inte", async () => {
    const c = [
      await createHealthyCourse({ teacher }),
      await createHealthyCourse({ teacher }),
      await createHealthyCourse({ teacher }),
    ];
    await createProduct({
      type: "PACK",
      courses: c.slice(0, 2),
      autobook: true,
    });
    await createProduct({ type: "CLIP", courses: c, autobook: true });
    await createProduct({
      type: "PACK",
      courses: c,
      autobook: true,
      maxCourses: 1,
    });

    expect(await issueCount("product-autobooks-everything")).toBe(0);
  });
});

describe("purchase-without-bookings", () => {
  it("hittar en enskild kurs utan autobokning, och 'Boka in på kursen' rättar det", async () => {
    const { course, product } = await courseWithProduct({ autobook: false });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    expect(await futureBookingCount(items[0].id)).toBe(0);

    expect(await issueCounts()).toEqual({ "purchase-without-bookings": 1 });
    const rows = await detailRows("purchase-without-bookings");
    expect(rows.map((r) => r.id)).toEqual([items[0].id]);
    const fix = fixOf(rows[0], "course-booking");
    expect(fix).toMatchObject({
      purchaseItemId: items[0].id,
      productAutobook: false,
      upcomingLessons: 4,
      remaining: "10",
    });
    expect(course.id).toBe(items[0].courseId);

    const result = await setCourseBooking(fix.purchaseItemId, true);
    expect(result.success).toBe(true);
    expect(await futureBookingCount(items[0].id)).toBe(4);
    expect(await issueCount("purchase-without-bookings")).toBe(0);
  });

  it("hittar en autobokande kurs där bokningarna aldrig skapades", async () => {
    const { product } = await courseWithProduct({ autobook: true });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    await prisma.booking.deleteMany({ where: { purchaseItemId: items[0].id } });
    await prisma.purchaseItem.update({
      where: { id: items[0].id },
      data: { remainingCount: 10 },
    });

    expect(await issueCounts()).toEqual({ "purchase-without-bookings": 1 });
    const fix = fixOf(
      (await detailRows("purchase-without-bookings"))[0],
      "course-booking",
    );
    expect(fix.productAutobook).toBe(true);
  });

  it("räknar inte paket utan autobokning, avslutade kurser eller elever som tagits bort", async () => {
    // Paket över två kurser utan autobokning: schemat sätts för hand.
    const a = await createHealthyCourse({ teacher });
    const b = await createHealthyCourse({ teacher });
    const pack = await createProduct({
      type: "PACK",
      courses: [a, b],
      autobook: false,
    });
    await buy({ admin, buyer: await createUser(), product: pack });

    // Kurs utan kommande lektioner.
    const { product: ended } = await courseWithProduct({
      autobook: false,
      past: 3,
      future: 0,
    });
    await buy({ admin, buyer: await createUser(), product: ended });

    // Eleven borttagen ur kursen av studion.
    const { course, product } = await courseWithProduct({ autobook: false });
    const removedBuyer = await createUser();
    await buy({ admin, buyer: removedBuyer, product });
    await prisma.courseRosterEntry.create({
      data: {
        courseId: course.id,
        studentKey: `user:${removedBuyer.id}`,
        userId: removedBuyer.id,
        status: "REMOVED",
        changedByUserId: admin.id,
      },
    });

    expect(await issueCounts()).toEqual({});
  });

  // Granskningsfynd a. Ett klippkort för en enda kurs, utan autobokning,
  // har noll bokningar tills kunden själv bokar — det är det normala. Ändå
  // flaggas det som allvarligt fel (admin-health.ts:330-344 →
  // course-roster.ts:39, "ger köpet bara en kurs räknas raden"), och
  // åtgärden "Boka in på kursen" (setCourseBooking med explicit) bokar då in
  // kunden på alla kommande lektioner och bränner klippen.
  it("flaggar inte ett klippkort för en kurs som kunden ännu inte bokat på", async () => {
    const course = await createHealthyCourse({ teacher, future: 4 });
    const clip = await createProduct({
      type: "CLIP",
      courses: [course],
      totalCount: 10,
      autobook: false,
    });
    const { purchase, items } = await buy({
      admin,
      buyer: await createUser(),
      product: clip,
    });
    expect(items).toHaveLength(1);
    expect(purchase.remainingCount).toBe(10);
    expect(await futureBookingCount(items[0].id)).toBe(0);

    expect(await issueCount("purchase-without-bookings")).toBe(0);
    expect(await detailRows("purchase-without-bookings")).toEqual([]);
  });

  // Granskningsfynd b. list() hämtar antalet kommande lektioner med en
  // lesson.count per rad (admin-health.ts:999-1007) — en fråga per elev.
  // Detaljvyn ska kosta lika många frågor oavsett hur många rader den har.
  it("detaljvyn gör lika många frågor för 2 som för 8 rader (ingen N+1)", async () => {
    const { product } = await courseWithProduct({ autobook: false });
    const measure = async () =>
      countQueries(() => getHealthDetail("purchase-without-bookings"));

    for (let i = 0; i < 2; i++) {
      await buy({ admin, buyer: await createUser(), product });
    }
    const small = await measure();
    expect(small.result?.rows).toHaveLength(2);

    for (let i = 0; i < 6; i++) {
      await buy({ admin, buyer: await createUser(), product });
    }
    const large = await measure();
    expect(large.result?.rows).toHaveLength(8);

    expect(small.queries).toBeGreaterThan(0);
    expect(large.queries).toBe(small.queries);
  });

  // Granskningsfynd b, översikten. Kontrollen är fixable, så
  // getHealthIssues kör purchaseItemsWithoutBookings två gånger — en för
  // count() och en för list() — och list() har N+1:an ovan.
  it("översikten gör lika många frågor för 2 som för 8 rader (ingen N+1)", async () => {
    const { product } = await courseWithProduct({ autobook: false });
    const measure = async () => countQueries(() => runHealthChecks());

    for (let i = 0; i < 2; i++) {
      await buy({ admin, buyer: await createUser(), product });
    }
    const small = await measure();
    for (let i = 0; i < 6; i++) {
      await buy({ admin, buyer: await createUser(), product });
    }
    const large = await measure();

    expect(large.queries).toBe(small.queries);
  });
});

describe("manual-student-without-purchase", () => {
  it("hittar ett manuellt tillägg utan köp, som försvinner när eleven köper", async () => {
    const { course, product } = await courseWithProduct();
    const student = await createUser();
    const entry = await prisma.courseRosterEntry.create({
      data: {
        courseId: course.id,
        studentKey: `user:${student.id}`,
        userId: student.id,
        status: "ADDED",
        changedByUserId: admin.id,
      },
    });

    expect(await issueCounts()).toEqual({
      "manual-student-without-purchase": 1,
    });
    expect(
      (await detailRows("manual-student-without-purchase")).map((r) => r.id),
    ).toEqual([entry.id]);

    await buy({ admin, buyer: student, product });
    expect(await issueCount("manual-student-without-purchase")).toBe(0);
  });

  it("räknar inte en kurs utan kommande lektioner", async () => {
    const { course } = await courseWithProduct({ past: 2, future: 0 });
    const student = await createUser();
    await prisma.courseRosterEntry.create({
      data: {
        courseId: course.id,
        studentKey: `user:${student.id}`,
        userId: student.id,
        status: "ADDED",
        changedByUserId: admin.id,
      },
    });
    expect(await issueCount("manual-student-without-purchase")).toBe(0);
  });
});

describe("order-with-courseless-product", () => {
  it("hittar en aktiv order på en produkt utan kurser, inte en avbruten", async () => {
    const product = await createProduct({ type: "COURSE", courses: [] });
    const order = await placeOrder({ buyer: await createUser(), product });
    const cancelled = await placeOrder({ buyer: await createUser(), product });
    await prisma.order.update({
      where: { id: cancelled.id },
      data: { status: "CANCELLED" },
    });

    expect(await issueCounts()).toEqual({
      "product-without-course": 1,
      "order-with-courseless-product": 1,
    });
    expect(
      (await detailRows("order-with-courseless-product")).map((r) => r.id),
    ).toEqual([order.id]);

    const { course } = await courseWithProduct();
    await prisma.productOnCourse.create({
      data: { productId: product.id, courseId: course.id, lessonsIncluded: 5 },
    });
    expect(await issueCounts()).toEqual({});
  });
});

describe("booking-course-mismatch", () => {
  it("hittar en bokning vars kursrad gäller en annan kurs", async () => {
    const { product } = await courseWithProduct();
    const { course: other } = await courseWithProduct();
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const otherLesson = await prisma.lesson.findFirstOrThrow({
      where: { courseId: other.id },
    });
    const wrong = await prisma.booking.create({
      data: {
        lessonId: otherLesson.id,
        purchaseItemId: items[0].id,
        userId: buyer.id,
      },
    });
    // En avbokad felbokning räknas inte.
    await prisma.booking.create({
      data: {
        lessonId: otherLesson.id,
        purchaseItemId: items[0].id,
        userId: buyer.id,
        cancelled: true,
      },
    });

    expect(await issueCounts()).toEqual({ "booking-course-mismatch": 1 });
    expect(
      (await detailRows("booking-course-mismatch")).map((r) => r.id),
    ).toEqual([wrong.id]);

    await prisma.booking.delete({ where: { id: wrong.id } });
    expect(await issueCount("booking-course-mismatch")).toBe(0);
  });
});

describe("duplicate-booking", () => {
  it("hittar dubbelbokningen, och åtgärden behåller den äldsta och återför klippet", async () => {
    const { product } = await courseWithProduct();
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const item = items[0];
    const [first] = await bookingsFor(item.id);
    await prisma.booking.create({
      data: {
        lessonId: first.lessonId,
        purchaseItemId: item.id,
        userId: buyer.id,
        createdAt: new Date(Date.now() + 1000),
      },
    });
    await prisma.purchaseItem.update({
      where: { id: item.id },
      data: { remainingCount: { decrement: 1 } },
    });
    const before = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: item.id },
    });

    expect(await issueCounts()).toEqual({ "duplicate-booking": 1 });
    const rows = await detailRows("duplicate-booking");
    expect(rows.map((r) => r.id)).toEqual([`${first.lessonId}-${item.id}`]);
    const fix = fixOf(rows[0], "booking-remove");
    expect(fix).toMatchObject({ reason: "duplicate", removes: 1 });

    const result = await removeStaleBooking(
      fix.lessonId,
      fix.purchaseItemId,
      "duplicate",
    );
    expect(result.success).toBe(true);
    expect(await issueCount("duplicate-booking")).toBe(0);

    const left = await prisma.booking.findMany({
      where: { lessonId: first.lessonId, purchaseItemId: item.id },
    });
    expect(left.map((b) => b.id)).toEqual([first.id]);
    const after = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.remainingCount).toBe(before.remainingCount + 1);

    // Inget kvar att ta bort.
    expect(
      (await removeStaleBooking(first.lessonId, item.id, "duplicate")).success,
    ).toBe(false);
  });
});

describe("duplicate-participant", () => {
  it("hittar dubbletter hos samma ägare, och mergeParticipants slår ihop dem", async () => {
    const owner = await createUser();
    const keep = await createParticipant(owner, "Kim Testsson");
    const copy = await createParticipant(owner, "  kim TESTSSON ");
    // Samma namn hos en annan ägare är en annan person.
    await createParticipant(await createUser(), "Kim Testsson");
    const { product } = await courseWithProduct({ autobook: false });
    const order = await placeOrder({
      buyer: owner,
      product,
      participant: copy,
    });

    expect(await issueCount("duplicate-participant")).toBe(1);
    const rows = await detailRows("duplicate-participant");
    expect(rows).toHaveLength(1);
    const fix = fixOf(rows[0], "participant-merge");
    expect(fix.copies.map((c) => c.id).sort()).toEqual(
      [keep.id, copy.id].sort(),
    );
    expect(fix.copies.find((c) => c.id === copy.id)?.orderItems).toBe(1);

    const result = await mergeParticipants(keep.id, [copy.id]);
    expect(result.success).toBe(true);

    expect(await issueCount("duplicate-participant")).toBe(0);
    expect(
      await prisma.participant.findUnique({ where: { id: copy.id } }),
    ).toBeNull();
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(item.participantId).toBe(keep.id);
  });

  it("mergeParticipants vägrar olika ägare och att slå ihop med sig själv", async () => {
    const a = await createParticipant(await createUser(), "Lo Test");
    const b = await createParticipant(await createUser(), "Lo Test");

    expect((await mergeParticipants(a.id, [b.id])).success).toBe(false);
    expect((await mergeParticipants(a.id, [a.id])).success).toBe(false);
    expect((await mergeParticipants(a.id, [])).success).toBe(false);
    expect(await prisma.participant.count()).toBe(2);
  });
});

describe("product-without-capacity", () => {
  it("hittar en aktiv produkt med noll platser", async () => {
    const { course } = await courseWithProduct();
    const product = await createProduct({ type: "COURSE", courses: [course] });
    await prisma.product.update({
      where: { id: product.id },
      data: { unlimitedCustomers: false, maxCustomer: 0 },
    });

    expect(await issueCounts()).toEqual({ "product-without-capacity": 1 });
    expect(
      (await detailRows("product-without-capacity")).map((r) => r.id),
    ).toEqual([product.id]);

    await prisma.product.update({
      where: { id: product.id },
      data: { maxCustomer: 20 },
    });
    expect(await issueCount("product-without-capacity")).toBe(0);
  });
});

describe("order-waiting-long", () => {
  it("hittar en order som väntat mer än 14 dagar, inte en färsk", async () => {
    const { product } = await courseWithProduct();
    const old = await placeOrder({ buyer: await createUser(), product });
    await placeOrder({ buyer: await createUser(), product });
    await prisma.order.update({
      where: { id: old.id },
      data: { createdAt: new Date(Date.now() - 15 * DAY) },
    });

    expect(await issueCounts()).toEqual({ "order-waiting-long": 1 });
    expect((await detailRows("order-waiting-long")).map((r) => r.id)).toEqual([
      old.id,
    ]);

    await prisma.order.update({
      where: { id: old.id },
      data: { status: "CANCELLED" },
    });
    expect(await issueCount("order-waiting-long")).toBe(0);
  });
});

describe("termin-ended-still-active", () => {
  it("hittar en aktiv termin som passerat slutdatum", async () => {
    const termin = await prisma.termin.create({
      data: {
        name: "Utgången",
        startDate: new Date(Date.now() - 100 * DAY),
        endDate: new Date(Date.now() - DAY),
      },
    });

    expect(await issueCounts()).toEqual({ "termin-ended-still-active": 1 });
    expect(
      (await detailRows("termin-ended-still-active")).map((r) => r.id),
    ).toEqual([termin.id]);

    await prisma.termin.update({
      where: { id: termin.id },
      data: { active: false },
    });
    expect(await issueCount("termin-ended-still-active")).toBe(0);
  });
});

describe("product-expired-still-active", () => {
  it("hittar en aktiv produkt vars sista datum passerat", async () => {
    const { product } = await courseWithProduct();
    await prisma.product.update({
      where: { id: product.id },
      data: { expireFixedDate: new Date(Date.now() - DAY) },
    });

    expect(await issueCounts()).toEqual({ "product-expired-still-active": 1 });
    expect(
      (await detailRows("product-expired-still-active")).map((r) => r.id),
    ).toEqual([product.id]);

    await prisma.product.update({
      where: { id: product.id },
      data: { active: false },
    });
    expect(await issueCount("product-expired-still-active")).toBe(0);
  });
});

describe("lesson-without-termin", () => {
  it("hittar en lektion utan termin", async () => {
    const { course } = await courseWithProduct();
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { courseId: course.id },
    });
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { terminId: null },
    });

    expect(await issueCounts()).toEqual({ "lesson-without-termin": 1 });
    expect(
      (await detailRows("lesson-without-termin")).map((r) => r.id),
    ).toEqual([lesson.id]);

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { terminId: (await prisma.termin.findFirstOrThrow()).id },
    });
    expect(await issueCount("lesson-without-termin")).toBe(0);
  });
});

describe("behörighet", () => {
  // Varje åtgärd anropas med ett fel som verkligen finns, så att en vägran
  // bara kan bero på behörigheten.
  async function brokenData() {
    const { product } = await courseWithProduct();
    const buyer = await createUser();
    const { items, purchase } = await buy({ admin, buyer, product });
    const [first] = await bookingsFor(items[0].id);
    await prisma.lesson.update({
      where: { id: first.lessonId },
      data: { cancelled: true },
    });

    const pending = await placeOrder({ buyer, product });
    await approveOrder(pending.id);

    const owner = await createUser();
    const p1 = await createParticipant(owner, "Dubblett");
    const p2 = await createParticipant(owner, "Dubblett");

    const plainTeacher = await createUser({ role: "user" });
    await createHealthyCourse({ teacher: plainTeacher });

    const packCourses = [
      await createHealthyCourse({ teacher }),
      await createHealthyCourse({ teacher }),
      await createHealthyCourse({ teacher }),
    ];
    const pack = await createProduct({
      type: "PACK",
      courses: packCourses,
      autobook: true,
    });

    // Ett köp utan rader.
    const emptyBuy = await buy({
      admin,
      buyer: await createUser(),
      product: await createProduct({
        type: "PACK",
        courses: packCourses.slice(0, 2),
        autobook: false,
      }),
    });
    await prisma.purchaseItem.deleteMany({
      where: { purchaseId: emptyBuy.purchase.id },
    });

    return {
      item: items[0],
      purchase,
      lessonId: first.lessonId,
      pendingOrderId: pending.id,
      p1,
      p2,
      plainTeacher,
      pack,
      emptyPurchaseId: emptyBuy.purchase.id,
    };
  }

  const sessions = [
    ["utloggad", () => actAs(null)],
    ["kund", async () => actAs({ id: (await createUser()).id, role: "user" })],
    ["lärare", async () => actAs({ id: teacher.id, role: "teacher" })],
  ] as const;

  it.each(sessions)("%s får inte köra någon åtgärd", async (_name, login) => {
    const d = await brokenData();
    actAs({ id: admin.id, role: "admin" });
    const before = await issueCounts();
    await login();

    const denied = { success: false, msg: "Ingen behörighet." };
    expect(await runHealthChecks()).toEqual(denied);
    expect(await mergeParticipants(d.p1.id, [d.p2.id])).toEqual(denied);
    expect(await backfillPurchaseItems(d.emptyPurchaseId)).toEqual(denied);
    expect(await grantTeacherRole(d.plainTeacher.id)).toEqual(denied);
    expect(
      await removeStaleBooking(d.lessonId, d.item.id, "cancelled"),
    ).toEqual(denied);
    expect(await createMissingPurchase(d.pendingOrderId)).toEqual(denied);
    expect(await disableProductAutobook(d.pack.id)).toEqual(denied);

    // Ingenting har ändrats.
    actAs({ id: admin.id, role: "admin" });
    expect(await issueCounts()).toEqual(before);
    expect(before).toMatchObject({
      "booking-on-cancelled": 1,
      "order-approved-without-purchase": 1,
      "duplicate-participant": 1,
      "teacher-without-role": 1,
      "product-autobooks-everything": 1,
      "purchase-without-items": 1,
    });
  });

  it("admin får köra kontrollerna", async () => {
    await brokenData();
    const result = await runHealthChecks();
    expect(result.success).toBe(true);
    if (!result.success) return;
    // Allvarligast först.
    const severities = result.issues.map((i) => i.severity);
    const firstWarning = severities.indexOf("warning");
    if (firstWarning >= 0) {
      expect(severities.slice(firstWarning)).not.toContain("serious");
    }
  });
});
