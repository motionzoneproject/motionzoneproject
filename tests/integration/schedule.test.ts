import { beforeAll, describe, expect, it } from "vitest";
import {
  getCourseRoster,
  removeStudentFromCourse,
} from "@/lib/actions/roster-actions";
import {
  bookMyCourse,
  getPurchaseSchedule,
  setCourseBooking,
} from "@/lib/actions/schedule-actions";
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
  asTeacher,
  asUser,
  bookingCount,
  bookPastLessons,
  clipRemaining,
  itemFor,
  itemRemaining,
  lessonsOf,
  participantKey,
  userKey,
} from "../helpers/roster";
import { actAs } from "../helpers/session";

type User = Awaited<ReturnType<typeof createUser>>;

let admin: User;
let teacher: User;
let otherTeacher: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
  teacher = await createUser({ role: "teacher" });
  otherTeacher = await createUser({ role: "teacher" });
});

/** Ett terminskort: flera kurser, ingen autobokning. */
async function termCard(opts: { past?: number; future?: number } = {}) {
  const a = await createCourse({
    teacher,
    name: "A-kurs",
    past: opts.past ?? 0,
    future: opts.future ?? 3,
  });
  const b = await createCourse({ teacher: otherTeacher, name: "B-kurs" });
  const product = await createProduct({
    type: "PACK",
    courses: [a, b],
    lessonsIncluded: 10,
    autobook: false,
  });
  return { a, b, product };
}

describe("getPurchaseSchedule", () => {
  it("visar varje kursrad med lektioner, bokningar och saldo", async () => {
    const { a, b, product } = await termCard({ past: 2, future: 3 });
    const buyer = await createUser({ name: "Elev Ett" });
    const { purchase, items } = await buy({ admin, buyer, product });
    await bookPastLessons(itemFor(items, a));

    asAdmin(admin);
    await setCourseBooking(itemFor(items, a).id, true);

    const schedule = await getPurchaseSchedule(purchase.id);
    expect(schedule).not.toBeNull();
    expect(schedule?.studentName).toBe("Elev Ett");
    expect(schedule?.productName).toBe(product.name);
    expect(schedule?.manualSchedule).toBe(true);
    expect(schedule?.sharedBalance).toBe(false);
    expect(schedule?.balance).toBeNull();

    expect(schedule?.rows.map((r) => r.courseId)).toEqual([a.id, b.id]);
    const [rowA, rowB] = schedule?.rows ?? [];
    expect(rowA).toMatchObject({
      purchaseItemId: itemFor(items, a).id,
      upcomingLessons: 3,
      bookedUpcoming: 3,
      bookedTotal: 5,
      remaining: "5",
      outOfBalance: false,
    });
    expect(rowB).toMatchObject({
      upcomingLessons: 4,
      bookedUpcoming: 0,
      bookedTotal: 0,
      remaining: "10",
      outOfBalance: false,
    });
  });

  it("räknar inte inställda lektioner som kommande, och visar slut saldo", async () => {
    const course = await createCourse({
      teacher,
      future: 4,
      cancelledFuture: 1,
    });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 3,
      autobook: true,
    });
    const { purchase } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    asAdmin(admin);
    const schedule = await getPurchaseSchedule(purchase.id);
    expect(schedule?.manualSchedule).toBe(false);
    expect(schedule?.rows[0]).toMatchObject({
      upcomingLessons: 3,
      bookedUpcoming: 3,
      remaining: "0",
      outOfBalance: true,
    });
  });

  it("klippkort över flera kurser har gemensamt saldo", async () => {
    const a = await createCourse({ teacher });
    const b = await createCourse({ teacher });
    const product = await createProduct({
      type: "CLIP",
      courses: [a, b],
      totalCount: 8,
    });
    const buyer = await createUser();
    const child = await createParticipant(buyer, "Barnet");
    const { purchase } = await buy({
      admin,
      buyer,
      product,
      participant: child,
    });

    asAdmin(admin);
    const schedule = await getPurchaseSchedule(purchase.id);
    expect(schedule?.studentName).toBe("Barnet");
    expect(schedule?.sharedBalance).toBe(true);
    expect(schedule?.balance).toBe("8");
    expect(schedule?.rows.every((r) => r.remaining === "8")).toBe(true);
  });

  it("obegränsad kursrad visar ∞", async () => {
    const course = await createCourse({ teacher });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      unlimited: true,
    });
    const { purchase } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    asAdmin(admin);
    const schedule = await getPurchaseSchedule(purchase.id);
    expect(schedule?.rows[0].remaining).toBe("∞");
    expect(schedule?.rows[0].outOfBalance).toBe(false);
  });

  it("bara admin får se schemat", async () => {
    const { product } = await termCard();
    const buyer = await createUser();
    const { purchase } = await buy({ admin, buyer, product });

    asTeacher(teacher);
    expect(await getPurchaseSchedule(purchase.id)).toBeNull();
    asUser(buyer);
    expect(await getPurchaseSchedule(purchase.id)).toBeNull();
    actAs(null);
    expect(await getPurchaseSchedule(purchase.id)).toBeNull();
    asAdmin(admin);
    expect(await getPurchaseSchedule("finns-inte")).toBeNull();
  });

  // Granskningsfynd 7. En bokning kan ligga kvar på en lektion som
  // ställts in (äldre data, eller en inställning som gjorts utan att
  // bokningarna rensats). Den räknas i bookedUpcoming men lektionen räknas
  // inte i upcomingLessons, så dialogen säger "Bokad på 6 av 5".
  it("[fynd 7] bokningar på inställda lektioner räknas inte som kommande bokningar", async () => {
    const course = await createCourse({ teacher, future: 6 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const { purchase, items } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });
    expect(await futureBookingCount(items[0].id)).toBe(6);

    const lessons = await lessonsOf(course.id);
    await prisma.lesson.update({
      where: { id: lessons[0].id },
      data: { cancelled: true },
    });

    asAdmin(admin);
    const row = (await getPurchaseSchedule(purchase.id))?.rows[0];
    expect(row?.upcomingLessons).toBe(5);
    expect(row?.bookedUpcoming).toBeLessThanOrEqual(row?.upcomingLessons ?? 0);
    expect(row?.bookedUpcoming).toBe(5);
  });
});

describe("bookMyCourse", () => {
  it("kunden bokar in sig på en kurs i sitt terminskort", async () => {
    const { a, b, product } = await termCard({ future: 3 });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });

    asUser(buyer);
    expect(await bookMyCourse(itemFor(items, a).id)).toEqual({
      success: true,
      count: 3,
    });
    expect(await itemRemaining(itemFor(items, a).id)).toBe(7);
    expect(await bookingCount(itemFor(items, b).id)).toBe(0);

    // Inget mer att boka.
    expect(await bookMyCourse(itemFor(items, a).id)).toEqual({
      success: false,
      reason: "nothingToBook",
    });
  });

  it("kunden bokar in sin deltagare, och deltagaren hamnar i elevlistan", async () => {
    const { a, product } = await termCard();
    const buyer = await createUser();
    const child = await createParticipant(buyer);
    const { items } = await buy({ admin, buyer, product, participant: child });

    asUser(buyer);
    const result = await bookMyCourse(itemFor(items, a).id);
    expect(result.success).toBe(true);

    asAdmin(admin);
    const roster = await getCourseRoster(a.id);
    expect(roster?.students.map((s) => s.studentKey)).toEqual([
      participantKey(child),
    ]);
  });

  it("säger nej när studion tagit bort eleven från kursen", async () => {
    const { a, product } = await termCard();
    const buyer = await createUser();
    const child = await createParticipant(buyer);
    const { items } = await buy({ admin, buyer, product, participant: child });

    asAdmin(admin);
    await setCourseBooking(itemFor(items, a).id, true);
    await removeStudentFromCourse(a.id, participantKey(child));

    asUser(buyer);
    expect(await bookMyCourse(itemFor(items, a).id)).toEqual({
      success: false,
      reason: "removedByStudio",
    });
    expect(await bookingCount(itemFor(items, a).id)).toBe(0);
  });

  it("säger nej till en kurs som kunden valt bort i paketet", async () => {
    const a = await createCourse({ teacher });
    const b = await createCourse({ teacher });
    const product = await createProduct({
      type: "PACK",
      courses: [a, b],
      maxCourses: 1,
    });
    const buyer = await createUser();
    const { purchase, items } = await buy({
      admin,
      buyer,
      product,
      selectedCourseIds: [a.id],
    });
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
    expect(await bookMyCourse(swapped.id)).toEqual({
      success: false,
      reason: "notSelected",
    });
    expect(await bookMyCourse(items[0].id)).toMatchObject({ success: true });
  });

  it("säger nej när saldot är slut", async () => {
    const { a, product } = await termCard();
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    await prisma.purchaseItem.update({
      where: { id: itemFor(items, a).id },
      data: { remainingCount: 0 },
    });

    asUser(buyer);
    expect(await bookMyCourse(itemFor(items, a).id)).toEqual({
      success: false,
      reason: "nothingToBook",
    });
  });

  it("utloggad, annan kund och okänd kursrad får unauthorized", async () => {
    const { a, product } = await termCard();
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });

    actAs(null);
    expect(await bookMyCourse(itemFor(items, a).id)).toEqual({
      success: false,
      reason: "unauthorized",
    });
    asUser(await createUser());
    expect(await bookMyCourse(itemFor(items, a).id)).toEqual({
      success: false,
      reason: "unauthorized",
    });
    asUser(buyer);
    expect(await bookMyCourse("finns-inte")).toEqual({
      success: false,
      reason: "unauthorized",
    });
    expect(await bookingCount(itemFor(items, a).id)).toBe(0);
  });
});

describe("setCourseBooking", () => {
  it("admin bokar in och ut: kommande bokningar tas bort, passerade står kvar, saldot återställs", async () => {
    const { a, product } = await termCard({ past: 2, future: 3 });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const item = itemFor(items, a);
    await bookPastLessons(item);

    asAdmin(admin);
    const inResult = await setCourseBooking(item.id, true);
    expect(inResult.success).toBe(true);
    expect(inResult.msg).toContain("3 lektioner");
    expect(await bookingCount(item.id)).toBe(5);
    expect(await itemRemaining(item.id)).toBe(5);

    const outResult = await setCourseBooking(item.id, false);
    expect(outResult.success).toBe(true);
    expect(await futureBookingCount(item.id)).toBe(0);
    expect(await bookingCount(item.id)).toBe(2);
    expect(await itemRemaining(item.id)).toBe(8);

    const again = await setCourseBooking(item.id, false);
    expect(again.success).toBe(false);
    expect(await itemRemaining(item.id)).toBe(8);
  });

  it("bokar in: misslyckas med tydligt meddelande när inget finns att boka", async () => {
    const a = await createCourse({ teacher, future: 0 });
    const b = await createCourse({ teacher });
    const product = await createProduct({ type: "PACK", courses: [a, b] });
    const { items } = await buy({ admin, buyer: await createUser(), product });

    asAdmin(admin);
    const result = await setCourseBooking(itemFor(items, a).id, true);
    expect(result.success).toBe(false);
    expect(result.msg).toMatch(/Inget att boka/);
  });

  it("klippkort: in- och utbokning drar och återbetalar den gemensamma potten", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "CLIP",
      courses: [a, b],
      totalCount: 10,
    });
    const { purchase, items } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    asAdmin(admin);
    await setCourseBooking(itemFor(items, a).id, true);
    await setCourseBooking(itemFor(items, b).id, true);
    expect(await clipRemaining(purchase.id)).toBe(4);

    await setCourseBooking(itemFor(items, a).id, false);
    expect(await clipRemaining(purchase.id)).toBe(7);
    expect(await bookingCount(itemFor(items, b).id)).toBe(3);
  });

  it("okänd kursrad", async () => {
    asAdmin(admin);
    const result = await setCourseBooking("finns-inte", true);
    expect(result).toEqual({ success: false, msg: "Kursraden hittades inte." });
  });

  it("annan lärare, kund och utloggad får inte boka in eller ut", async () => {
    const { a, product } = await termCard();
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const item = itemFor(items, a);
    asAdmin(admin);
    await setCourseBooking(item.id, true);

    for (const who of [
      () => asTeacher(otherTeacher),
      () => asUser(buyer),
      () => actAs(null),
    ]) {
      who();
      expect(await setCourseBooking(item.id, false)).toEqual({
        success: false,
        msg: "Ingen behörighet.",
      });
      expect(await setCourseBooking(item.id, true)).toEqual({
        success: false,
        msg: "Ingen behörighet.",
      });
    }
    expect(await futureBookingCount(item.id)).toBe(3);
    expect(await itemRemaining(item.id)).toBe(7);
  });

  it("kursens lärare får boka ut", async () => {
    const { a, product } = await termCard();
    const { items } = await buy({ admin, buyer: await createUser(), product });
    const item = itemFor(items, a);
    asAdmin(admin);
    await setCourseBooking(item.id, true);

    asTeacher(teacher);
    const result = await setCourseBooking(item.id, false);
    expect(result.success).toBe(true);
    expect(await futureBookingCount(item.id)).toBe(0);
    expect(await itemRemaining(item.id)).toBe(10);
  });

  // Granskningsfynd 5. Funktionen lovar "Admin, eller kursens egen lärare",
  // men autobook bokar bara åt admin eller köpets ägare.
  it("[fynd 5] kursens lärare får boka in en elev på sin kurs", async () => {
    const { a, product } = await termCard({ future: 3 });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    const item = itemFor(items, a);

    asTeacher(teacher);
    const result = await setCourseBooking(item.id, true);
    expect(result.success).toBe(true);
    expect(await futureBookingCount(item.id)).toBe(3);
    expect(await itemRemaining(item.id)).toBe(7);
  });

  // Granskningsfynd 2. Ett terminskort placerar eleven i en kurs genom
  // bokningarna — även passerade. Att bocka ur kursen tar bara bort de
  // kommande, så eleven står kvar i elevlistan på grund av närvaron.
  it("[fynd 2] att bocka ur en kurs tar bort eleven ur elevlistan även med passerade bokningar", async () => {
    const { a, product } = await termCard({ past: 2, future: 3 });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    const item = itemFor(items, a);
    await bookPastLessons(item);

    asAdmin(admin);
    await setCourseBooking(item.id, true);
    expect(
      (await getCourseRoster(a.id))?.students.map((s) => s.studentKey),
    ).toEqual([userKey(buyer)]);

    await setCourseBooking(item.id, false);
    expect(await bookingCount(item.id)).toBe(2); // närvaron står kvar
    expect((await getCourseRoster(a.id))?.students).toEqual([]);
  });

  // Granskningsfynd 3. Bokningarna läses utanför transaktionen och
  // återbetalningen bygger på det antalet, inte på vad deleteMany tog bort.
  it("[fynd 3] två samtidiga utbokningar återbetalar saldot bara en gång", async () => {
    const { a, product } = await termCard({ future: 3 });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    const item = itemFor(items, a);

    asAdmin(admin);
    await setCourseBooking(item.id, true);
    expect(await itemRemaining(item.id)).toBe(7);

    await Promise.all([
      setCourseBooking(item.id, false),
      setCourseBooking(item.id, false),
    ]);
    expect(await futureBookingCount(item.id)).toBe(0);
    expect(await itemRemaining(item.id)).toBe(10);
  });

  it("[fynd 3] två samtidiga utbokningar på klippkort återbetalar klippen bara en gång", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "CLIP",
      courses: [a, b],
      totalCount: 10,
    });
    const { purchase, items } = await buy({
      admin,
      buyer: await createUser(),
      product,
    });

    asAdmin(admin);
    await setCourseBooking(itemFor(items, a).id, true);
    expect(await clipRemaining(purchase.id)).toBe(7);

    await Promise.all([
      setCourseBooking(itemFor(items, a).id, false),
      setCourseBooking(itemFor(items, a).id, false),
    ]);
    expect(await clipRemaining(purchase.id)).toBe(10);
  });
});
