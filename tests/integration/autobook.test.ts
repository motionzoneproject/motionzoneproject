import { beforeAll, describe, expect, it } from "vitest";
import { removeStudentFromCourse } from "@/lib/actions/roster-actions";
import { bookMyCourse } from "@/lib/actions/schedule-actions";
import { autobook } from "@/lib/actions/server-actions";
import prisma from "@/lib/prisma";
import {
  buy,
  createCourse,
  createParticipant,
  createProduct,
  createUser,
  futureBookingCount,
} from "../helpers/factories";
import {
  asAdmin,
  asUser,
  bookingCount,
  clipRemaining,
  itemFor,
  itemRemaining,
  participantKey,
  rosterEntry,
  userKey,
} from "../helpers/roster";
import { actAs } from "../helpers/session";

type User = Awaited<ReturnType<typeof createUser>>;

let admin: User;
let teacher: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
  teacher = await createUser({ role: "teacher" });
});

describe("autobook vid ordergodkännande", () => {
  it("COURSE: bokar alla kommande lektioner som inte är inställda och drar saldot", async () => {
    const course = await createCourse({
      teacher,
      past: 2,
      future: 4,
      cancelledFuture: 1,
    });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 10,
      autobook: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });

    expect(await futureBookingCount(items[0].id)).toBe(3);
    expect(await bookingCount(items[0].id)).toBe(3); // inga passerade
    expect(await itemRemaining(items[0].id)).toBe(7);
  });

  it("COURSE: bokar aldrig fler lektioner än saldot räcker till", async () => {
    const course = await createCourse({ teacher, future: 4 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 2,
      autobook: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });

    expect(await futureBookingCount(items[0].id)).toBe(2);
    expect(await itemRemaining(items[0].id)).toBe(0);

    asAdmin(admin);
    expect(await autobook(items[0].id, undefined, { explicit: true })).toEqual(
      [],
    );
    expect(await futureBookingCount(items[0].id)).toBe(2);
  });

  it("COURSE obegränsad: bokar alla kommande lektioner utan att röra saldot", async () => {
    const course = await createCourse({ teacher, future: 5 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 3,
      unlimited: true,
      autobook: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });

    expect(await futureBookingCount(items[0].id)).toBe(5);
    expect(await itemRemaining(items[0].id)).toBe(3);
  });

  it("PACK med autobokning bokar in alla paketets kurser", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 2 });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      lessonsIncluded: 10,
      autobook: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });

    expect(await futureBookingCount(itemFor(items, a).id)).toBe(3);
    expect(await futureBookingCount(itemFor(items, b).id)).toBe(2);
    expect(await itemRemaining(itemFor(items, a).id)).toBe(7);
    expect(await itemRemaining(itemFor(items, b).id)).toBe(8);
  });

  it("terminskort utan autobokning bokar ingenting, och autobook utan explicit gör inget heller", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      autobook: false,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });

    expect(await bookingCount(items[0].id)).toBe(0);
    expect(await bookingCount(items[1].id)).toBe(0);

    asAdmin(admin);
    expect(await autobook(items[0].id)).toEqual([]);

    // Admin som uttryckligen väljer kursen får boka.
    const created = await autobook(itemFor(items, a).id, undefined, {
      explicit: true,
    });
    expect(created).toHaveLength(3);
    expect(await itemRemaining(itemFor(items, a).id)).toBe(7);
    expect(await bookingCount(itemFor(items, b).id)).toBe(0);
  });

  it("maxCourses: bara de valda kurserna blir kursrader och bokas in", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      maxCourses: 1,
      autobook: true,
    });
    const { items } = await buy({
      admin,
      buyer: await createUser(),
      product,
      selectedCourseIds: [b.id],
    });

    expect(items.map((i) => i.courseId)).toEqual([b.id]);
    expect(await futureBookingCount(items[0].id)).toBe(3);
  });

  it("maxCourses: en kursrad för en bortvald kurs bokas inte åt kunden, men admin kan välja den uttryckligen", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      maxCourses: 1,
      autobook: true,
    });
    const buyer = await createUser();
    const { purchase, items } = await buy({
      admin,
      buyer,
      product,
      selectedCourseIds: [a.id],
    });

    // En kursrad för den bortvalda kursen, som äldre köp kan ha.
    const swapped = await prisma.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        orderItemId: items[0].orderItemId,
        courseId: b.id,
        type: "PACK",
        lessonsIncluded: 10,
        remainingCount: 10,
      },
    });

    asUser(buyer);
    expect(await autobook(swapped.id)).toEqual([]);
    expect(await autobook(swapped.id, undefined, { explicit: true })).toEqual(
      [],
    );
    expect(await bookingCount(swapped.id)).toBe(0);

    asAdmin(admin);
    expect(
      await autobook(swapped.id, undefined, { explicit: true }),
    ).toHaveLength(3);
  });

  it("CLIP för en kurs: autobokningen drar från klippkortets gemensamma saldo", async () => {
    const course = await createCourse({ teacher, future: 4 });
    const product = await createProduct({
      type: "CLIP",
      courses: [course],
      totalCount: 10,
      autobook: true,
    });
    const { purchase, items } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    asAdmin(admin);
    const created = await autobook(items[0].id);
    expect(created).toHaveLength(4);
    expect(await bookingCount(items[0].id)).toBe(4);
    expect(await clipRemaining(purchase.id)).toBe(6);
  });

  it("CLIP: bokar aldrig fler lektioner än klippen räcker till", async () => {
    const course = await createCourse({ teacher, future: 5 });
    const product = await createProduct({
      type: "CLIP",
      courses: [course],
      totalCount: 3,
      autobook: true,
    });
    const { purchase, items } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    asAdmin(admin);
    await autobook(items[0].id);
    expect(await bookingCount(items[0].id)).toBe(3);
    expect(await clipRemaining(purchase.id)).toBe(0);
  });

  it("CLIP för flera kurser: ingen automatisk bokning, men admin kan boka en utpekad kurs", async () => {
    const a = await createCourse({ teacher, future: 4 });
    const b = await createCourse({ teacher, future: 4 });
    const product = await createProduct({
      type: "CLIP",
      courses: [a, b],
      totalCount: 10,
      autobook: true,
    });
    const { purchase, items } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    asAdmin(admin);
    expect(await autobook(itemFor(items, a).id)).toEqual([]);
    expect(await clipRemaining(purchase.id)).toBe(10);

    const created = await autobook(itemFor(items, a).id, undefined, {
      explicit: true,
    });
    expect(created).toHaveLength(4);
    expect(await clipRemaining(purchase.id)).toBe(6);
    expect(await bookingCount(itemFor(items, b).id)).toBe(0);
  });

  it("deltagare och konto bokas var för sig: kontots bokningar hindrar inte deltagarens", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const buyer = await createUser();
    const child = await createParticipant(buyer);

    const own = await buy({ admin, buyer, product });
    const forChild = await buy({ admin, buyer, product, participant: child });

    expect(await futureBookingCount(own.items[0].id)).toBe(3);
    expect(await futureBookingCount(forChild.items[0].id)).toBe(3);
  });

  it("bokar inte samma lektion två gånger för samma elev", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });

    asAdmin(admin);
    expect(await autobook(items[0].id, undefined, { explicit: true })).toEqual(
      [],
    );
    expect(await bookingCount(items[0].id)).toBe(3);
    expect(await itemRemaining(items[0].id)).toBe(7);

    // Ett andra köp för samma elev i samma kurs bokar inte heller dubbelt.
    const again = await buy({ admin, buyer, product });
    expect(await bookingCount(again.items[0].id)).toBe(0);
    expect(await itemRemaining(again.items[0].id)).toBe(10);
  });

  it("en bokning häver en tidigare borttagning från kursen (admin)", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({ type: "PACK", courses: [a, b] });
    const buyer = await createUser();
    const child = await createParticipant(buyer);
    const { items } = await buy({ admin, buyer, product, participant: child });

    asAdmin(admin);
    await autobook(itemFor(items, a).id, undefined, { explicit: true });
    await removeStudentFromCourse(a.id, participantKey(child));
    expect((await rosterEntry(a.id, participantKey(child)))?.status).toBe(
      "REMOVED",
    );

    await autobook(itemFor(items, a).id, undefined, { explicit: true });
    expect(await rosterEntry(a.id, participantKey(child))).toBeNull();
  });
});

describe("autobook: behörighet", () => {
  it("utloggad får ingenting bokat", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const product = await createProduct({ type: "COURSE", courses: [course] });
    const { items } = await buy({ admin, buyer: await createUser(), product });

    actAs(null);
    expect(await autobook(items[0].id, undefined, { explicit: true })).toEqual(
      [],
    );
    expect(await bookingCount(items[0].id)).toBe(0);
  });

  it("en kund kan inte boka på någon annans köp", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    await prisma.booking.deleteMany({ where: { purchaseItemId: items[0].id } });

    asUser(await createUser());
    expect(await autobook(items[0].id, undefined, { explicit: true })).toEqual(
      [],
    );
    expect(await bookingCount(items[0].id)).toBe(0);
  });

  // Granskningsfynd 1. autobook ligger i en "use server"-fil och är därmed
  // en publik endpoint. Kunden ska bara kunna boka hel kurs via bookMyCourse,
  // som säger nej när studion tagit bort eleven.
  it("[fynd 1] en kund kan inte anropa autobook direkt och boka förbi studions borttagning (terminskort)", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      autobook: false,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const item = itemFor(items, a);

    asAdmin(admin);
    await autobook(item.id, undefined, { explicit: true });
    await removeStudentFromCourse(a.id, userKey(buyer));
    expect(await bookingCount(item.id)).toBe(0);

    asUser(buyer);
    expect(await bookMyCourse(item.id)).toEqual({
      success: false,
      reason: "removedByStudio",
    });

    const created = await autobook(item.id, undefined, { explicit: true });
    expect(created).toEqual([]);
    expect(await bookingCount(item.id)).toBe(0);
    expect((await rosterEntry(a.id, userKey(buyer)))?.status).toBe("REMOVED");
  });

  it("[fynd 1] en kund kan inte anropa autobook direkt och boka förbi studions borttagning (klippkort för flera kurser)", async () => {
    const a = await createCourse({ teacher, future: 4 });
    const b = await createCourse({ teacher, future: 4 });
    const product = await createProduct({
      type: "CLIP",
      courses: [a, b],
      totalCount: 10,
    });
    const buyer = await createUser();
    const { purchase, items } = await buy({ admin, buyer, product });

    asAdmin(admin);
    await removeStudentFromCourse(a.id, userKey(buyer));

    asUser(buyer);
    const created = await autobook(itemFor(items, a).id, undefined, {
      explicit: true,
    });
    expect(created).toEqual([]);
    expect(await clipRemaining(purchase.id)).toBe(10);
    expect((await rosterEntry(a.id, userKey(buyer)))?.status).toBe("REMOVED");
  });

  // Nytt fynd: autobook läser befintliga bokningar utanför transaktionen och
  // det finns ingen unik nyckel på (lektion, kursrad). Två samtidiga anrop —
  // en dubbelklickad "Boka hela kursen" — bokar då varje lektion två gånger
  // och drar saldot dubbelt.
  it("två samtidiga bookMyCourse bokar inte samma lektioner två gånger", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      lessonsIncluded: 10,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const item = itemFor(items, a);

    asUser(buyer);
    await Promise.all([bookMyCourse(item.id), bookMyCourse(item.id)]);

    expect(await bookingCount(item.id)).toBe(3);
    expect(await itemRemaining(item.id)).toBe(7);
  });
});
