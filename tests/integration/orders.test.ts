import { beforeAll, describe, expect, it } from "vitest";
import {
  adminChangePurchaseItemCourse,
  approveOrder,
  cancelOrder,
  createPurchaseFromOrder,
  deleteOrder,
  getUserOrder,
  getUserOrders,
  setOrderPaid,
  updateOrder,
  updateOrderItemCourseSelections,
  updateOrderStatus,
} from "@/lib/actions/orders";
import { handleClips } from "@/lib/clips";
import { createOrder } from "@/lib/orders";
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
  as,
  futureLessonsOf,
  insertBooking,
  pastLessonsOf,
} from "../helpers/orders";

type User = Awaited<ReturnType<typeof createUser>>;

let admin: User;
let teacher: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
  teacher = await createUser({ role: "teacher" });
});

async function courseProduct(opts: { future?: number; past?: number } = {}) {
  const course = await createCourse({
    teacher,
    past: opts.past ?? 0,
    future: opts.future ?? 4,
  });
  const product = await createProduct({
    type: "COURSE",
    courses: [course],
    lessonsIncluded: 10,
    autobook: true,
    price: 1234_50,
  });
  return { course, product };
}

async function packProduct(opts: { courses?: number; maxCourses?: number }) {
  const courses = [];
  for (let i = 0; i < (opts.courses ?? 3); i++) {
    courses.push(await createCourse({ teacher, past: 0, future: 3 }));
  }
  const product = await createProduct({
    type: "PACK",
    courses,
    lessonsIncluded: 3,
    autobook: true,
    maxCourses: opts.maxCourses ?? 2,
  });
  return { courses, product };
}

describe("orderns livscykel", () => {
  it("skapa → bevilja → köp → autobokning → betald", async () => {
    const { course, product } = await courseProduct({ future: 4 });
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });

    expect(order.status).toBe("AWAITING_APPROVAL");
    expect(order.totalPrice).toBe(1234_50);
    expect(order.isPaid).toBe(false);

    const firstEvents = await prisma.orderStatusEvent.findMany({
      where: { orderId: order.id },
    });
    expect(firstEvents).toHaveLength(1);
    expect(firstEvents[0]).toMatchObject({
      fromStatus: null,
      toStatus: "AWAITING_APPROVAL",
      changedByUserId: buyer.id,
    });

    await as(admin, async () => {
      const res = await approveOrder(order.id, "ok");
      expect(res).toMatchObject({ success: true, status: "APPROVED" });
      const created = await createPurchaseFromOrder(order.id);
      expect(created.success).toBe(true);
    });

    const events = await prisma.orderStatusEvent.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => e.toStatus)).toEqual([
      "AWAITING_APPROVAL",
      "APPROVED",
    ]);
    expect(events[1].changedByUserId).toBe(admin.id);
    expect(events[1].note).toBe("ok");

    const purchases = await prisma.purchase.findMany({
      where: { orderId: order.id },
      include: { PurchaseItems: true },
    });
    expect(purchases).toHaveLength(1);
    expect(purchases[0]).toMatchObject({
      userId: buyer.id,
      productId: product.id,
      type: "COURSE",
    });
    expect(purchases[0].PurchaseItems).toHaveLength(1);
    const item = purchases[0].PurchaseItems[0];
    expect(item.courseId).toBe(course.id);

    // Autobokningen tog alla fyra kommande lektioner och drog fyra tillfällen.
    expect(await futureBookingCount(item.id)).toBe(4);
    const after = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.lessonsIncluded).toBe(10);
    expect(after.remainingCount).toBe(6);

    await as(admin, () => setOrderPaid(order.id, true));
    const paid = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(paid.isPaid).toBe(true);
    expect(paid.paidAt).toBeInstanceOf(Date);
    // Betald påverkar inte godkännandestatusen.
    expect(paid.status).toBe("APPROVED");

    await as(admin, () => setOrderPaid(order.id, false));
    const unpaid = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(unpaid.isPaid).toBe(false);
    expect(unpaid.paidAt).toBeNull();
  });

  it("en deltagares köp hamnar på deltagaren men ägs av köparen", async () => {
    const { product } = await courseProduct({ future: 2 });
    const buyer = await createUser();
    const child = await createParticipant(buyer, "Barnet Testsson");
    const { purchase, items } = await buy({
      admin,
      buyer,
      product,
      participant: child,
    });
    expect(purchase.userId).toBe(buyer.id);
    expect(purchase.participantId).toBe(child.id);
    const bookings = await bookingsFor(items[0].id);
    expect(bookings).toHaveLength(2);
    expect(bookings.every((b) => b.userId === buyer.id)).toBe(true);
  });
});

describe("statusövergångar", () => {
  it("en beviljad order kan inte avbrytas", async () => {
    const { product } = await courseProduct();
    const buyer = await createUser();
    const { order } = await buy({ admin, buyer, product });

    await expect(as(admin, () => cancelOrder(order.id))).rejects.toThrow(
      "Kan inte avbryta en redan beviljad order.",
    );
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.status).toBe("APPROVED");
  });

  it("en väntande order kan avbrytas, och sedan skapas inget köp", async () => {
    const { product } = await courseProduct();
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });

    await as(admin, () => cancelOrder(order.id, "kunden ångrade sig"));
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.status).toBe("CANCELLED");

    await expect(
      as(admin, () => createPurchaseFromOrder(order.id)),
    ).rejects.toThrow("Ordern är inte beviljad ännu.");
    expect(await prisma.purchase.count({ where: { orderId: order.id } })).toBe(
      0,
    );
  });

  it("inget köp skapas för en order som fortfarande väntar", async () => {
    const { product } = await courseProduct();
    const order = await placeOrder({ buyer: await createUser(), product });
    await expect(
      as(admin, () => createPurchaseFromOrder(order.id)),
    ).rejects.toThrow("Ordern är inte beviljad ännu.");
    expect(await prisma.purchase.count({ where: { orderId: order.id } })).toBe(
      0,
    );
  });

  it("att sätta samma status igen är en no-op utan ny händelse", async () => {
    const { product } = await courseProduct();
    const order = await placeOrder({ buyer: await createUser(), product });
    await as(admin, () => approveOrder(order.id));
    await as(admin, () => approveOrder(order.id));
    expect(
      await prisma.orderStatusEvent.count({ where: { orderId: order.id } }),
    ).toBe(2);
  });

  it("okänd order ger fel", async () => {
    await expect(as(admin, () => approveOrder("finns-inte"))).rejects.toThrow(
      "Order not found",
    );
  });

  it("en avbruten order kan inte beviljas i efterhand", async () => {
    // En avbruten order har släppt sin plats (getProductStats räknar inte
    // CANCELLED) och är enligt EDITABLE_STATUSES låst. Att bevilja den igen
    // skulle kunna sälja fler platser än som finns.
    const { product } = await courseProduct();
    const order = await placeOrder({ buyer: await createUser(), product });
    await as(admin, () => cancelOrder(order.id));

    await expect(as(admin, () => approveOrder(order.id))).rejects.toThrow();
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.status).toBe("CANCELLED");
  });

  it("spärren mot att avbryta en beviljad order går inte att kringgå via AWAITING_APPROVAL", async () => {
    const { product } = await courseProduct({ future: 3 });
    const buyer = await createUser();
    const { order, items } = await buy({ admin, buyer, product });
    expect(await futureBookingCount(items[0].id)).toBe(3);

    // Försök gå tillbaka till "väntar" och därifrån avbryta.
    await as(admin, async () => {
      try {
        await updateOrderStatus(order.id, "AWAITING_APPROVAL");
      } catch {}
      try {
        await cancelOrder(order.id);
      } catch {}
    });

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    const purchases = await prisma.purchase.count({
      where: { orderId: order.id },
    });
    // Antingen får ordern inte bli avbruten, eller så får det inte finnas
    // ett aktivt köp med bokningar kvar på en avbruten order.
    expect(after.status === "CANCELLED" && purchases > 0).toBe(false);
    // Och en order med köp ska inte kunna gå tillbaka till "väntar".
    expect(after.status).toBe("APPROVED");
  });

  it("samtidig bevilja och avbryt: bara en av dem får gå igenom", async () => {
    const { product } = await courseProduct();
    const buyer = await createUser();
    const orders = [];
    for (let i = 0; i < 5; i++)
      orders.push(await placeOrder({ buyer, product }));

    for (const order of orders) {
      await as(admin, () =>
        Promise.allSettled([approveOrder(order.id), cancelOrder(order.id)]),
      );
    }

    for (const order of orders) {
      const events = await prisma.orderStatusEvent.findMany({
        where: { orderId: order.id, fromStatus: "AWAITING_APPROVAL" },
      });
      // Från AWAITING_APPROVAL kan ordern bara lämna en gång.
      expect(events).toHaveLength(1);
    }
  });
});

describe("behörighet", () => {
  it("bara admin kan bevilja, avbryta, ändra, betala, skapa köp och ta bort", async () => {
    const { product } = await courseProduct();
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    });

    for (const who of [
      null,
      { id: buyer.id, role: "user" },
      { id: teacher.id, role: "teacher" },
    ]) {
      await as(who, async () => {
        await expect(approveOrder(order.id)).rejects.toThrow("No permission.");
        await expect(cancelOrder(order.id)).rejects.toThrow("No permission.");
        await expect(setOrderPaid(order.id, true)).rejects.toThrow(
          "No permission.",
        );
        await expect(createPurchaseFromOrder(order.id)).rejects.toThrow(
          "No permission.",
        );
        await expect(
          updateOrder(order.id, {
            creates: [],
            updates: [
              {
                orderItemId: item.id,
                productId: product.id,
                participantId: null,
              },
            ],
            deletes: [],
          }),
        ).rejects.toThrow("No permission.");
        await expect(
          updateOrderItemCourseSelections(order.id, item.id, []),
        ).rejects.toThrow("No permission.");
        await expect(deleteOrder(order.id)).rejects.toThrow("No permission.");
      });
    }

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.status).toBe("AWAITING_APPROVAL");
    expect(after.isPaid).toBe(false);
  });

  it("adminChangePurchaseItemCourse kräver admin", async () => {
    const { product } = await courseProduct();
    const other = await createCourse({ teacher, future: 2 });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    await expect(
      as(buyer, () => adminChangePurchaseItemCourse(items[0].id, other.id)),
    ).rejects.toThrow("No permission.");
  });

  it("en kund ser bara sina egna ordrar", async () => {
    const { product } = await courseProduct();
    const alice = await createUser();
    const bob = await createUser();
    const aliceOrder = await placeOrder({ buyer: alice, product });
    const bobOrder = await placeOrder({ buyer: bob, product });

    const mine = await as(alice, () => getUserOrders());
    expect(mine.map((o) => o.id)).toEqual([aliceOrder.id]);

    await expect(as(alice, () => getUserOrder(bobOrder.id))).rejects.toThrow(
      "Order not found or access denied",
    );
    const own = await as(alice, () => getUserOrder(aliceOrder.id));
    expect(own.id).toBe(aliceOrder.id);

    await expect(as(null, () => getUserOrders())).rejects.toThrow(
      "Unauthorized",
    );
    await expect(as(null, () => getUserOrder(aliceOrder.id))).rejects.toThrow(
      "Unauthorized",
    );
  });
});

describe("paket med maxCourses", () => {
  it("beviljas inte utan kursval", async () => {
    const { product } = await packProduct({ maxCourses: 2 });
    const order = await placeOrder({ buyer: await createUser(), product });
    await expect(as(admin, () => approveOrder(order.id))).rejects.toThrow(
      /max 2 olika kurser/,
    );
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.status).toBe("AWAITING_APPROVAL");
  });

  it("beviljas inte med för många kurser", async () => {
    const { product, courses } = await packProduct({ maxCourses: 2 });
    const order = await placeOrder({
      buyer: await createUser(),
      product,
      selectedCourseIds: courses.map((c) => c.id),
    });
    await expect(as(admin, () => approveOrder(order.id))).rejects.toThrow(
      /max 2 olika kurser/,
    );
  });

  it("beviljas inte med en kurs som inte hör till produkten", async () => {
    const { product, courses } = await packProduct({ maxCourses: 2 });
    const stranger = await createCourse({ teacher, future: 2 });
    const order = await placeOrder({
      buyer: await createUser(),
      product,
      selectedCourseIds: [courses[0].id, stranger.id],
    });
    await expect(as(admin, () => approveOrder(order.id))).rejects.toThrow(
      /finns inte kopplad till produkten/,
    );
  });

  it("dubbletter sparas bara en gång", async () => {
    const { product, courses } = await packProduct({ maxCourses: 2 });
    const order = await placeOrder({
      buyer: await createUser(),
      product,
      selectedCourseIds: [courses[0].id, courses[0].id],
    });
    const selections = await prisma.orderItemCourseSelection.count({
      where: { orderItem: { orderId: order.id } },
    });
    expect(selections).toBe(1);
  });

  it("köpet och autobokningen gäller bara de valda kurserna", async () => {
    const { product, courses } = await packProduct({
      courses: 3,
      maxCourses: 2,
    });
    const buyer = await createUser();
    const { items } = await buy({
      admin,
      buyer,
      product,
      selectedCourseIds: [courses[0].id, courses[2].id],
    });

    expect(items.map((i) => i.courseId).sort()).toEqual(
      [courses[0].id, courses[2].id].sort(),
    );
    for (const item of items) {
      expect(await futureBookingCount(item.id)).toBe(3);
    }
    const unchosen = await prisma.booking.count({
      where: { lesson: { courseId: courses[1].id }, userId: buyer.id },
    });
    expect(unchosen).toBe(0);
  });

  describe("updateOrderItemCourseSelections", () => {
    async function pendingPack() {
      const { product, courses } = await packProduct({ maxCourses: 2 });
      const order = await placeOrder({
        buyer: await createUser(),
        product,
        selectedCourseIds: [courses[0].id],
      });
      const item = await prisma.orderItem.findFirstOrThrow({
        where: { orderId: order.id },
      });
      return { product, courses, order, item };
    }

    it("nekar tomt val, för många, och kurser utanför produkten", async () => {
      const { courses, order, item } = await pendingPack();
      const stranger = await createCourse({ teacher, future: 1 });

      await as(admin, async () => {
        expect(
          await updateOrderItemCourseSelections(order.id, item.id, []),
        ).toMatchObject({
          success: false,
          msg: "Du måste välja minst en kurs.",
        });
        expect(
          await updateOrderItemCourseSelections(
            order.id,
            item.id,
            courses.map((c) => c.id),
          ),
        ).toMatchObject({
          success: false,
          msg: "Du får välja högst 2 kurser.",
        });
        expect(
          await updateOrderItemCourseSelections(order.id, item.id, [
            stranger.id,
          ]),
        ).toMatchObject({
          success: false,
          msg: "En vald kurs finns inte kopplad till produkten.",
        });
      });

      const selections = await prisma.orderItemCourseSelection.findMany({
        where: { orderItemId: item.id },
      });
      expect(selections.map((s) => s.courseId)).toEqual([courses[0].id]);
    });

    it("nekar en orderrad som inte hör till ordern", async () => {
      const a = await pendingPack();
      const b = await pendingPack();
      const res = await as(admin, () =>
        updateOrderItemCourseSelections(a.order.id, b.item.id, [
          b.courses[1].id,
        ]),
      );
      expect(res.success).toBe(false);
    });

    it("nekar en avbruten order", async () => {
      const { courses, order, item } = await pendingPack();
      await as(admin, () => cancelOrder(order.id));
      const res = await as(admin, () =>
        updateOrderItemCourseSelections(order.id, item.id, [courses[1].id]),
      );
      expect(res).toMatchObject({
        success: false,
        msg: "Paketvalet kan inte ändras på en avbruten order.",
      });
    });

    it("dubbletter i valet räknas som en kurs", async () => {
      const { courses, order, item } = await pendingPack();
      const res = await as(admin, () =>
        updateOrderItemCourseSelections(order.id, item.id, [
          courses[1].id,
          courses[1].id,
          courses[2].id,
        ]),
      );
      expect(res).toMatchObject({
        success: true,
        selectedCourseIds: [courses[1].id, courses[2].id],
      });
    });

    it("byte på en beviljad order flyttar bokningarna till den nya kursen", async () => {
      const { product, courses } = await packProduct({ maxCourses: 1 });
      const buyer = await createUser();
      const { order, items } = await buy({
        admin,
        buyer,
        product,
        selectedCourseIds: [courses[0].id],
      });
      expect(await futureBookingCount(items[0].id)).toBe(3);

      const res = await as(admin, () =>
        updateOrderItemCourseSelections(order.id, items[0].orderItemId, [
          courses[1].id,
        ]),
      );
      expect(res.success).toBe(true);

      // Gamla raden hade bara framtida bokningar → raderad helt.
      expect(
        await prisma.purchaseItem.findUnique({ where: { id: items[0].id } }),
      ).toBeNull();
      const newItem = await prisma.purchaseItem.findFirstOrThrow({
        where: { orderItemId: items[0].orderItemId },
      });
      expect(newItem.courseId).toBe(courses[1].id);
      expect(await futureBookingCount(newItem.id)).toBe(3);
      expect(newItem.remainingCount).toBe(0);
    });

    it("ett kursbyte trollar inte fram fler tillfällen än paketet innehåller", async () => {
      // Samma regel som adminChangePurchaseItemCourse uttryckligen följer:
      // redan förbrukade (passerade) tillfällen ska dras från den nya kursens pott.
      const courseA = await createCourse({ teacher, past: 2, future: 4 });
      const courseB = await createCourse({ teacher, past: 0, future: 6 });
      const product = await createProduct({
        type: "PACK",
        courses: [courseA, courseB],
        lessonsIncluded: 6,
        autobook: true,
        maxCourses: 1,
      });
      const buyer = await createUser();
      const { order, items } = await buy({
        admin,
        buyer,
        product,
        selectedCourseIds: [courseA.id],
      });
      const itemA = items[0];
      // Två passerade lektioner har gåtts.
      for (const lesson of await pastLessonsOf(courseA.id)) {
        await insertBooking({
          lessonId: lesson.id,
          purchaseItemId: itemA.id,
          userId: buyer.id,
        });
      }
      await prisma.$transaction((tx) => handleClips(tx, itemA.id, -2));
      const before = await prisma.purchaseItem.findUniqueOrThrow({
        where: { id: itemA.id },
      });
      expect(before.remainingCount).toBe(0); // 6 − 4 autobokade − 2 gångna

      const res = await as(admin, () =>
        updateOrderItemCourseSelections(order.id, itemA.orderItemId, [
          courseB.id,
        ]),
      );
      expect(res.success).toBe(true);

      const itemB = await prisma.purchaseItem.findFirstOrThrow({
        where: { orderItemId: itemA.orderItemId, courseId: courseB.id },
      });
      const bookedB = await prisma.booking.count({
        where: { purchaseItemId: itemB.id },
      });
      // Kunden har 6 tillfällen totalt och har redan gått 2.
      expect(bookedB + itemB.remainingCount).toBeLessThanOrEqual(4);
    });
  });
});

describe("adminChangePurchaseItemCourse", () => {
  it("drar redan gångna tillfällen från den nya kursens pott", async () => {
    const courseA = await createCourse({ teacher, past: 2, future: 4 });
    const courseB = await createCourse({ teacher, past: 0, future: 6 });
    const product = await createProduct({
      type: "COURSE",
      courses: [courseA],
      lessonsIncluded: 6,
      autobook: true,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const itemA = items[0];
    for (const lesson of await pastLessonsOf(courseA.id)) {
      await insertBooking({
        lessonId: lesson.id,
        purchaseItemId: itemA.id,
        userId: buyer.id,
      });
    }
    await prisma.$transaction((tx) => handleClips(tx, itemA.id, -2));

    const res = await as(admin, () =>
      adminChangePurchaseItemCourse(itemA.id, courseB.id),
    );
    expect(res).toEqual({ success: true });

    // Historiken ligger kvar på gamla raden, som nollställts.
    const oldItem = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: itemA.id },
    });
    expect(oldItem.remainingCount).toBe(0);
    expect(
      await prisma.booking.count({ where: { purchaseItemId: itemA.id } }),
    ).toBe(2);
    expect(await futureBookingCount(itemA.id)).toBe(0);

    const itemB = await prisma.purchaseItem.findFirstOrThrow({
      where: { purchaseId: itemA.purchaseId, courseId: courseB.id },
    });
    const bookedB = await prisma.booking.count({
      where: { purchaseItemId: itemB.id },
    });
    expect(bookedB).toBe(4);
    expect(itemB.remainingCount).toBe(0);
  });

  it("nekar samma kurs, okänd kurs och en kurs som redan finns i köpet", async () => {
    const { product, courses } = await packProduct({ maxCourses: 2 });
    const { items } = await buy({
      admin,
      buyer: await createUser(),
      product,
      selectedCourseIds: [courses[0].id, courses[1].id],
    });
    await as(admin, async () => {
      expect(
        await adminChangePurchaseItemCourse(items[0].id, items[0].courseId),
      ).toMatchObject({ success: false });
      expect(
        await adminChangePurchaseItemCourse(items[0].id, "finns-inte"),
      ).toMatchObject({ success: false });
      expect(
        await adminChangePurchaseItemCourse(items[0].id, items[1].courseId),
      ).toMatchObject({
        success: false,
        msg: "Den valda kursen finns redan i köpet.",
      });
    });
  });
});

describe("idempotens", () => {
  it("createPurchaseFromOrder två gånger i rad skapar ett köp", async () => {
    const { product } = await courseProduct({ future: 4 });
    const buyer = await createUser();
    const { order, items } = await buy({ admin, buyer, product });

    const again = await as(admin, () => createPurchaseFromOrder(order.id));
    expect(again).toMatchObject({
      success: true,
      purchaseId: items[0].purchaseId,
    });
    expect(await prisma.purchase.count({ where: { orderId: order.id } })).toBe(
      1,
    );
    expect(await futureBookingCount(items[0].id)).toBe(4);
  });

  it("createPurchaseFromOrder samtidigt (dubbelklick på Bevilja) skapar inte dubbla köp", async () => {
    const { product } = await courseProduct({ future: 4 });
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });

    // Som admin-sidan gör det: approveOrder följt av createPurchaseFromOrder,
    // två gånger samtidigt.
    await as(admin, () =>
      Promise.allSettled([
        approveOrder(order.id).then(() => createPurchaseFromOrder(order.id)),
        approveOrder(order.id).then(() => createPurchaseFromOrder(order.id)),
      ]),
    );

    const purchases = await prisma.purchase.findMany({
      where: { orderId: order.id },
    });
    expect(purchases).toHaveLength(1);
    const bookings = await prisma.booking.count({
      where: { userId: buyer.id },
    });
    expect(bookings).toBe(4);
  });

  it("createPurchaseFromOrder samtidigt direkt med Promise.all", async () => {
    const { product } = await courseProduct({ future: 4 });
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });
    await as(admin, () => approveOrder(order.id));

    // Får gärna lyckas eller ge fel, men bara ett köp får finnas.
    await as(admin, () =>
      Promise.allSettled([
        createPurchaseFromOrder(order.id),
        createPurchaseFromOrder(order.id),
        createPurchaseFromOrder(order.id),
      ]),
    );
    expect
      .soft(await prisma.purchase.count({ where: { orderId: order.id } }))
      .toBe(1);
    // Och kunden ska inte ha fler bokningar eller tillfällen än ett köp ger.
    expect
      .soft(await prisma.booking.count({ where: { userId: buyer.id } }))
      .toBe(4);
    const pot = await prisma.purchaseItem.aggregate({
      where: { purchase: { orderId: order.id } },
      _sum: { lessonsIncluded: true },
    });
    expect.soft(pot._sum.lessonsIncluded).toBe(10);
  });
});

describe("updateOrder", () => {
  it("räknar om totalpriset i öre från produkternas pris", async () => {
    const { product } = await courseProduct(); // 1234_50
    const cheap = await createProduct({
      type: "COURSE",
      courses: [await createCourse({ teacher, future: 1 })],
      price: 99_90,
    });
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    });

    const res = await as(admin, () =>
      updateOrder(order.id, {
        creates: [{ productId: cheap.id, participantId: null }],
        updates: [
          { orderItemId: item.id, productId: cheap.id, participantId: null },
        ],
        deletes: [],
      }),
    );
    expect(res).toEqual({ success: true });
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { orderItems: true },
    });
    expect(after.orderItems).toHaveLength(2);
    expect(after.orderItems.every((oi) => oi.price === 99_90)).toBe(true);
    expect(after.totalPrice).toBe(2 * 99_90);
  });

  it("produktbyte rensar paketvalen", async () => {
    const { product, courses } = await packProduct({ maxCourses: 2 });
    const other = await packProduct({ maxCourses: 2 });
    const order = await placeOrder({
      buyer: await createUser(),
      product,
      selectedCourseIds: [courses[0].id],
    });
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await as(admin, () =>
      updateOrder(order.id, {
        creates: [],
        updates: [
          {
            orderItemId: item.id,
            productId: other.product.id,
            participantId: null,
          },
        ],
        deletes: [],
      }),
    );
    expect(
      await prisma.orderItemCourseSelection.count({
        where: { orderItemId: item.id },
      }),
    ).toBe(0);
  });

  it("nekar att ta bort sista raden, andra orders rader och låsta ordrar", async () => {
    const { product } = await courseProduct();
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });
    const other = await placeOrder({ buyer, product });
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    });
    const otherItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: other.id },
    });

    await as(admin, async () => {
      expect(
        await updateOrder(order.id, {
          creates: [],
          updates: [],
          deletes: [item.id],
        }),
      ).toMatchObject({ success: false });
      expect(
        await updateOrder(order.id, {
          creates: [],
          updates: [],
          deletes: [otherItem.id],
        }),
      ).toMatchObject({ success: false });
    });
    expect(await prisma.orderItem.count({ where: { orderId: other.id } })).toBe(
      1,
    );

    const { order: approved, items } = await buy({ admin, buyer, product });
    const res = await as(admin, () =>
      updateOrder(approved.id, {
        creates: [],
        updates: [
          {
            orderItemId: items[0].orderItemId,
            productId: product.id,
            participantId: null,
          },
        ],
        deletes: [],
      }),
    );
    expect(res).toMatchObject({
      success: false,
      msg: "Ordern kan inte ändras i sitt nuvarande status.",
    });
  });
});

describe("deleteOrder", () => {
  it("tar bort ordern med köp och bokningar", async () => {
    const { product } = await courseProduct({ future: 3 });
    const buyer = await createUser();
    const { order, purchase, items } = await buy({ admin, buyer, product });
    expect(await futureBookingCount(items[0].id)).toBe(3);

    await as(admin, () => deleteOrder(order.id));

    expect(
      await prisma.order.findUnique({ where: { id: order.id } }),
    ).toBeNull();
    expect(
      await prisma.purchase.findUnique({ where: { id: purchase.id } }),
    ).toBeNull();
    expect(
      await prisma.booking.count({ where: { purchaseItemId: items[0].id } }),
    ).toBe(0);
  });

  it("nekar tomt och okänt orderId", async () => {
    await as(admin, async () => {
      await expect(deleteOrder("  ")).rejects.toThrow("Giltigt orderId saknas");
      await expect(deleteOrder("finns-inte")).rejects.toThrow(
        "Ordern hittades inte",
      );
    });
  });
});

describe("kursbyte fram och tillbaka", () => {
  it("att byta A → B → A lämnar inte kunden utan tillfällen", async () => {
    const courseA = await createCourse({ teacher, past: 1, future: 3 });
    const courseB = await createCourse({ teacher, past: 0, future: 3 });
    const product = await createProduct({
      type: "PACK",
      courses: [courseA, courseB],
      lessonsIncluded: 6,
      autobook: true,
      maxCourses: 1,
    });
    const buyer = await createUser();
    const { order, items } = await buy({
      admin,
      buyer,
      product,
      selectedCourseIds: [courseA.id],
    });
    const itemA = items[0];
    // En gången lektion på A, så raden ligger kvar som historik vid bytet.
    const [past] = await pastLessonsOf(courseA.id);
    await insertBooking({
      lessonId: past.id,
      purchaseItemId: itemA.id,
      userId: buyer.id,
    });
    await prisma.$transaction((tx) => handleClips(tx, itemA.id, -1));

    await as(admin, () =>
      updateOrderItemCourseSelections(order.id, itemA.orderItemId, [
        courseB.id,
      ]),
    );
    const back = await as(admin, () =>
      updateOrderItemCourseSelections(order.id, itemA.orderItemId, [
        courseA.id,
      ]),
    );
    expect(back.success).toBe(true);

    const a = await prisma.purchaseItem.findFirstOrThrow({
      where: { orderItemId: itemA.orderItemId, courseId: courseA.id },
    });
    // Kunden är tillbaka på A och ska vara bokad på A:s kommande lektioner.
    expect(await futureBookingCount(a.id)).toBe(3);
  });
});

describe("antal per orderrad", () => {
  it("det kunden debiteras för motsvarar det kunden får", async () => {
    const course = await createCourse({ teacher, future: 2 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      price: 500_00,
    });
    const buyer = await createUser();
    // En orderrad blir ett köp. Ett antal över 1 skulle debitera för platser
    // som aldrig skapas, så createOrder tar inte emot det.
    await expect(
      prisma.$transaction((tx) =>
        createOrder(tx, {
          userId: buyer.id,
          items: [{ productId: product.id, count: 2, price: product.price }],
        }),
      ),
    ).rejects.toThrow();
    expect(await prisma.order.count({ where: { userId: buyer.id } })).toBe(0);
  });
});

describe("getUserOrder", () => {
  it("visar kunden statushistoriken utan adminens kontouppgifter eller anteckningar", async () => {
    const course = await createCourse({ teacher, future: 1 });
    const product = await createProduct({ type: "COURSE", courses: [course] });
    const buyer = await createUser();
    const order = await placeOrder({ buyer, product });
    await as(admin, () => approveOrder(order.id, "intern: ringde kunden"));

    const seen = await as(buyer, () => getUserOrder(order.id));
    const text = JSON.stringify(seen);
    expect(text).not.toContain(admin.email);
    expect(text).not.toContain("intern: ringde kunden");
    expect(seen.statusEvents.map((e) => e.toStatus)).toEqual([
      "AWAITING_APPROVAL",
      "APPROVED",
    ]);
  });
});

describe("unlimited", () => {
  it("ett obegränsat köp bokar alla kommande lektioner och rör aldrig saldot", async () => {
    const course = await createCourse({
      teacher,
      future: 5,
      cancelledFuture: 1,
    });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 2,
      unlimited: true,
      autobook: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    // 5 kommande, varav 1 inställd.
    expect(await futureBookingCount(items[0].id)).toBe(4);
    expect((await futureLessonsOf(course.id)).length).toBe(4);
    const item = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: items[0].id },
    });
    expect(item.unlimited).toBe(true);
    expect(item.remainingCount).toBe(2);
  });
});
