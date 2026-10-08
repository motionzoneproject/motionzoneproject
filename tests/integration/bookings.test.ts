import { beforeAll, describe, expect, it } from "vitest";
import {
  getMyParticipants,
  getOrCreateParticipant,
  getParticipantsForUser,
  updateParticipant,
} from "@/lib/actions/participants";
import {
  delBooking,
  getUserBookings,
  getUserLessons,
  getUserPendingRegistrations,
  getUserPurchases,
} from "@/lib/actions/server-actions";
import prisma from "@/lib/prisma";
import {
  bookingsFor,
  buy,
  createCourse,
  createParticipant,
  createProduct,
  createUser,
  placeOrder,
} from "../helpers/factories";
import { as, insertBooking, pastLessonsOf } from "../helpers/orders";

type User = Awaited<ReturnType<typeof createUser>>;

let admin: User;
let teacher: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
  teacher = await createUser({ role: "teacher" });
});

async function bought(opts: { past?: number; future?: number } = {}) {
  const course = await createCourse({
    teacher,
    past: opts.past ?? 0,
    future: opts.future ?? 3,
  });
  const product = await createProduct({
    type: "COURSE",
    courses: [course],
    lessonsIncluded: 10,
    autobook: true,
  });
  const buyer = await createUser();
  const res = await buy({ admin, buyer, product });
  return { ...res, course, product, buyer, item: res.items[0] };
}

const remaining = async (id: string) =>
  (await prisma.purchaseItem.findUniqueOrThrow({ where: { id } }))
    .remainingCount;

describe("delBooking", () => {
  it("kunden avbokar sin egen kommande bokning och får tillbaka tillfället", async () => {
    const { item, buyer } = await bought({ future: 3 });
    expect(await remaining(item.id)).toBe(7);
    const [first] = await bookingsFor(item.id);

    const res = await as(buyer, () => delBooking(first.lessonId, item.id));
    expect(res).toMatchObject({ success: true });
    expect(await bookingsFor(item.id)).toHaveLength(2);
    expect(await remaining(item.id)).toBe(8);
  });

  it("kräver inloggning", async () => {
    const { item } = await bought();
    const [first] = await bookingsFor(item.id);
    expect(await as(null, () => delBooking(first.lessonId, item.id))).toEqual({
      success: false,
      msg: "Ingen giltig session.",
    });
    expect(await bookingsFor(item.id)).toHaveLength(3);
  });

  it("en kund kan inte avboka någon annans bokning", async () => {
    const { item } = await bought();
    const intruder = await createUser();
    const [first] = await bookingsFor(item.id);

    const res = await as(intruder, () => delBooking(first.lessonId, item.id));
    expect(res.success).toBe(false);
    expect(await bookingsFor(item.id)).toHaveLength(3);
    expect(await remaining(item.id)).toBe(7);
  });

  it("en passerad lektion kan inte avbokas", async () => {
    const { item, buyer, course } = await bought({ past: 1, future: 1 });
    const [past] = await pastLessonsOf(course.id);
    await insertBooking({
      lessonId: past.id,
      purchaseItemId: item.id,
      userId: buyer.id,
    });
    const before = await remaining(item.id);

    const res = await as(buyer, () => delBooking(past.id, item.id));
    expect(res).toEqual({
      success: false,
      msg: "Kan inte avboka en lektion som redan har startat.",
    });
    expect(
      await prisma.booking.count({
        where: { lessonId: past.id, purchaseItemId: item.id },
      }),
    ).toBe(1);
    expect(await remaining(item.id)).toBe(before);
  });

  it("en inställd lektion avbokas inte (och ger inte ett extra tillfälle)", async () => {
    const { item, buyer } = await bought({ future: 2 });
    const [first] = await bookingsFor(item.id);
    await prisma.lesson.update({
      where: { id: first.lessonId },
      data: { cancelled: true },
    });
    const res = await as(buyer, () => delBooking(first.lessonId, item.id));
    expect(res.success).toBe(false);
    expect(await remaining(item.id)).toBe(8);
  });

  it("okänd lektion och fel köprad ger fel utan att något ändras", async () => {
    const { item, buyer } = await bought();
    const other = await bought();
    const [first] = await bookingsFor(item.id);

    expect(
      (await as(buyer, () => delBooking("finns-inte", item.id))).success,
    ).toBe(false);
    // Rätt lektion men någon annans köprad.
    expect(
      (await as(buyer, () => delBooking(first.lessonId, other.item.id)))
        .success,
    ).toBe(false);
    expect(await bookingsFor(item.id)).toHaveLength(3);
    expect(await remaining(other.item.id)).toBe(7);
  });

  it("dubbelklick på avboka ger bara tillbaka ett tillfälle", async () => {
    const { item, buyer } = await bought({ future: 3 });
    const [first] = await bookingsFor(item.id);
    await as(buyer, () =>
      Promise.all([
        delBooking(first.lessonId, item.id),
        delBooking(first.lessonId, item.id),
        delBooking(first.lessonId, item.id),
      ]),
    );
    expect(await bookingsFor(item.id)).toHaveLength(2);
    expect(await remaining(item.id)).toBe(8);
  });

  it("köparen kan avboka en deltagares bokning", async () => {
    const course = await createCourse({ teacher, future: 2 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 5,
      autobook: true,
    });
    const parent = await createUser();
    const child = await createParticipant(parent);
    const { items } = await buy({
      admin,
      buyer: parent,
      product,
      participant: child,
    });
    const [first] = await bookingsFor(items[0].id);
    const res = await as(parent, () => delBooking(first.lessonId, items[0].id));
    expect(res.success).toBe(true);
    expect(await remaining(items[0].id)).toBe(4);
  });
});

describe("kundens egna listor", () => {
  it("getUserBookings, getUserPurchases och getUserLessons visar bara egna köp", async () => {
    const a = await bought({ future: 2 });
    const b = await bought({ future: 2 });

    const bookings = await as(a.buyer, () => getUserBookings());
    expect(bookings.success).toBe(true);
    expect(bookings.bookings?.map((x) => x.purchaseItemId)).toEqual([
      a.item.id,
      a.item.id,
    ]);

    const purchases = await as(a.buyer, () => getUserPurchases());
    expect(purchases.map((p) => p.id)).toEqual([a.item.id]);

    const lessons = await as(a.buyer, () => getUserLessons());
    expect(new Set(lessons.lessons?.map((l) => l.courseId))).toEqual(
      new Set([a.course.id]),
    );
    expect(lessons.lessons?.some((l) => l.courseId === b.course.id)).toBe(
      false,
    );

    expect(await as(null, () => getUserBookings())).toMatchObject({
      success: false,
    });
    expect(await as(null, () => getUserPurchases())).toEqual([]);
    expect(await as(null, () => getUserLessons())).toMatchObject({
      success: false,
    });
  });

  it("ett konto som är kopplat som deltagare ser sina köp", async () => {
    const course = await createCourse({ teacher, future: 2 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const parent = await createUser();
    const teen = await createUser();
    const participant = await prisma.participant.create({
      data: { name: "Tonåring", addedByUserId: parent.id, userId: teen.id },
    });
    const { items } = await buy({ admin, buyer: parent, product, participant });

    const purchases = await as(teen, () => getUserPurchases());
    expect(purchases.map((p) => p.id)).toEqual([items[0].id]);
    const bookings = await as(teen, () => getUserBookings());
    expect(bookings.bookings).toHaveLength(2);
  });

  it("paket med maxCourses: getUserLessons visar bara valda kurser", async () => {
    const courses = [
      await createCourse({ teacher, future: 1 }),
      await createCourse({ teacher, future: 1 }),
    ];
    const product = await createProduct({
      type: "PACK",
      courses,
      maxCourses: 1,
      lessonsIncluded: 1,
    });
    const buyer = await createUser();
    await buy({
      admin,
      buyer,
      product,
      selectedCourseIds: [courses[1].id],
    });
    const lessons = await as(buyer, () => getUserLessons());
    expect(lessons.lessons?.map((l) => l.courseId)).toEqual([courses[1].id]);
  });

  it("getUserPendingRegistrations visar bara egna väntande ordrar", async () => {
    const course = await createCourse({ teacher, future: 1 });
    const product = await createProduct({ type: "COURSE", courses: [course] });
    const alice = await createUser();
    const bob = await createUser();
    const pending = await placeOrder({ buyer: alice, product });
    await placeOrder({ buyer: bob, product });
    await buy({ admin, buyer: alice, product }); // beviljad, ska inte synas

    const mine = await as(alice, () => getUserPendingRegistrations());
    expect(mine.map((i) => i.orderId)).toEqual([pending.id]);
    expect(await as(null, () => getUserPendingRegistrations())).toEqual([]);
  });
});

describe("deltagare", () => {
  it("en kund ser bara sina egna deltagare; andras kräver admin", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const aliceChild = await createParticipant(alice);
    await createParticipant(bob);

    const mine = await as(alice, () => getMyParticipants());
    expect(mine.map((p) => p.id)).toEqual([aliceChild.id]);

    expect(await as(alice, () => getParticipantsForUser(bob.id))).toEqual([]);
    expect(await as(null, () => getMyParticipants())).toEqual([]);
    const forAdmin = await as(admin, () => getParticipantsForUser(alice.id));
    expect(forAdmin.map((p) => p.id)).toEqual([aliceChild.id]);
  });

  it("en kund kan inte ändra någon annans deltagare", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const bobChild = await createParticipant(bob, "Bobs Barn");

    await expect(
      as(alice, () => updateParticipant(bobChild.id, { name: "Kapad" })),
    ).rejects.toThrow("No permission to edit this participant");
    await expect(
      as(null, () => updateParticipant(bobChild.id, { name: "Kapad" })),
    ).rejects.toThrow("Unauthorized");

    const after = await prisma.participant.findUniqueOrThrow({
      where: { id: bobChild.id },
    });
    expect(after.name).toBe("Bobs Barn");

    await as(admin, () =>
      updateParticipant(bobChild.id, { name: "Ändrad Av Admin" }),
    );
    await as(bob, () =>
      updateParticipant(bobChild.id, { phone: "0701112233" }),
    );
    const final = await prisma.participant.findUniqueOrThrow({
      where: { id: bobChild.id },
    });
    expect(final).toMatchObject({
      name: "Ändrad Av Admin",
      phone: "0701112233",
    });
  });

  it("en ändring får inte tömma namnet", async () => {
    const alice = await createUser();
    const child = await createParticipant(alice, "Barnet");
    await expect(
      as(alice, () => updateParticipant(child.id, { name: "" })),
    ).rejects.toThrow();
  });

  it("getOrCreateParticipant kräver födelsedatum och återanvänder samma namn", async () => {
    const alice = await createUser();
    await expect(
      as(alice, () =>
        getOrCreateParticipant({ name: "Nytt Barn", allowPhotoVideo: false }),
      ),
    ).rejects.toThrow(/födelsedatum/i);

    const created = await as(alice, () =>
      getOrCreateParticipant({
        name: "Nytt Barn",
        dateOfBirth: "2016-03-04",
        allowPhotoVideo: true,
      }),
    );
    expect(created.addedByUserId).toBe(alice.id);

    const again = await as(alice, () =>
      getOrCreateParticipant({ name: "  nytt barn ", allowPhotoVideo: false }),
    );
    expect(again.id).toBe(created.id);

    // En annan kund med samma namn får en egen deltagare.
    const bob = await createUser();
    const bobs = await as(bob, () =>
      getOrCreateParticipant({
        name: "Nytt Barn",
        dateOfBirth: "2016-03-04",
        allowPhotoVideo: false,
      }),
    );
    expect(bobs.id).not.toBe(created.id);
    expect(bobs.addedByUserId).toBe(bob.id);

    await expect(
      as(null, () =>
        getOrCreateParticipant({ name: "X Y", allowPhotoVideo: false }),
      ),
    ).rejects.toThrow("Unauthorized");
  });
});
