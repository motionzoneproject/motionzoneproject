import { beforeAll, describe, expect, it } from "vitest";
import {
  addStudentToCourse,
  getCourseRoster,
  getCourseStudentCounts,
  removeStudentFromCourse,
  searchStudentsForCourse,
} from "@/lib/actions/roster-actions";
import { setCourseBooking } from "@/lib/actions/schedule-actions";
import prisma from "@/lib/prisma";
import {
  buy,
  createCourse,
  createParticipant,
  createProduct,
  createUser,
  futureBookingCount,
  placeOrder,
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
  participantKey,
  rosterEntry,
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

function keysOf(roster: Awaited<ReturnType<typeof getCourseRoster>>) {
  return (roster?.students ?? []).map((s) => s.studentKey).sort();
}

/** Ett terminskort: två kurser, ingen autobokning. Kurs a har lärare `teacher`. */
async function termCard(opts: { past?: number; future?: number } = {}) {
  const a = await createCourse({
    teacher,
    past: opts.past ?? 0,
    future: opts.future ?? 3,
  });
  const b = await createCourse({ teacher: otherTeacher });
  const product = await createProduct({
    type: "PACK",
    courses: [a, b],
    lessonsIncluded: 10,
    autobook: false,
  });
  return { a, b, product };
}

describe("getCourseRoster", () => {
  it("listar elever enligt köp och bokningar, sorterat på namn", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const other = await createCourse({ teacher });

    // Vanlig autobokande kurs.
    const courseProduct = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const bertil = await createUser({ name: "Bertil" });
    await buy({ admin, buyer: bertil, product: courseProduct });

    // Deltagare på ett köp med bara en kurs, utan autobokning.
    const single = await createProduct({ type: "COURSE", courses: [course] });
    const parent = await createUser({ name: "Förälder" });
    const child = await createParticipant(parent, "Adam");
    await buy({ admin, buyer: parent, product: single, participant: child });

    // Terminskort: bara de som bokats på kursen.
    const card = await createProduct({
      type: "PACK",
      courses: [course, other],
    });
    const cecilia = await createUser({ name: "Cecilia" });
    const david = await createUser({ name: "David" });
    const c = await buy({ admin, buyer: cecilia, product: card });
    await buy({ admin, buyer: david, product: card });
    asAdmin(admin);
    await setCourseBooking(itemFor(c.items, course).id, true);

    // Order som väntar på godkännande.
    const erik = await createUser({ name: "Erik" });
    await placeOrder({ buyer: erik, product: courseProduct });

    asAdmin(admin);
    const roster = await getCourseRoster(course.id);
    expect(roster?.courseId).toBe(course.id);
    expect(roster?.students.map((s) => s.name)).toEqual([
      "Adam",
      "Bertil",
      "Cecilia",
      "Erik",
    ]);

    const byName = new Map(roster?.students.map((s) => [s.name, s]));
    expect(byName.get("Adam")).toMatchObject({
      studentKey: participantKey(child),
      customerName: "Förälder",
      products: [single.name],
      bookings: 0,
      pending: false,
      addedManually: false,
    });
    expect(byName.get("Bertil")).toMatchObject({
      studentKey: userKey(bertil),
      customerName: null,
      products: [courseProduct.name],
      bookings: 3,
    });
    expect(byName.get("Cecilia")?.bookings).toBe(3);
    expect(byName.get("Erik")).toMatchObject({ pending: true, bookings: 0 });

    // Samma regel i antalet.
    const counts = await getCourseStudentCounts([course.id, other.id]);
    expect(counts).toEqual({ [course.id]: 4, [other.id]: 0 });
  });

  it("en kurs som bytts bort i paketet räknas inte", async () => {
    const a = await createCourse({ teacher });
    const b = await createCourse({ teacher });
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
    // En kursrad för den bortvalda kursen, med bokningar, som äldre köp kan ha.
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
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { courseId: b.id },
    });
    await prisma.booking.create({
      data: {
        lessonId: lesson.id,
        purchaseItemId: swapped.id,
        userId: buyer.id,
      },
    });

    asAdmin(admin);
    expect(keysOf(await getCourseRoster(a.id))).toEqual([userKey(buyer)]);
    expect(keysOf(await getCourseRoster(b.id))).toEqual([]);
  });

  it("kursens lärare ser listan; annan lärare, kund och utloggad gör det inte", async () => {
    const course = await createCourse({ teacher });

    asTeacher(teacher);
    expect(await getCourseRoster(course.id)).not.toBeNull();
    asTeacher(otherTeacher);
    expect(await getCourseRoster(course.id)).toBeNull();
    asUser(await createUser());
    expect(await getCourseRoster(course.id)).toBeNull();
    actAs(null);
    expect(await getCourseRoster(course.id)).toBeNull();
    asAdmin(admin);
    expect(await getCourseRoster("finns-inte")).toBeNull();
  });

  it("getCourseStudentCounts är bara för admin", async () => {
    const course = await createCourse({ teacher });
    asTeacher(teacher);
    expect(await getCourseStudentCounts([course.id])).toEqual({});
    actAs(null);
    expect(await getCourseStudentCounts([course.id])).toEqual({});
  });

  // Granskningsfynd 4. mayManageCourse jämför bara teacherId, inte rollen.
  it("[fynd 4] en före detta lärare (roll user) som står kvar på kursen får inte hantera den", async () => {
    const formerTeacher = await createUser({ role: "teacher" });
    const course = await createCourse({ teacher: formerTeacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    await prisma.user.update({
      where: { id: formerTeacher.id },
      data: { role: "user" },
    });

    actAs({ id: formerTeacher.id, role: "user" });
    expect(await getCourseRoster(course.id)).toBeNull();
    expect(await searchStudentsForCourse(course.id, buyer.name)).toEqual([]);
    expect(await removeStudentFromCourse(course.id, userKey(buyer))).toEqual({
      success: false,
      msg: "Ingen behörighet.",
    });
    expect(await setCourseBooking(items[0].id, false)).toEqual({
      success: false,
      msg: "Ingen behörighet.",
    });
    expect(await futureBookingCount(items[0].id)).toBe(3);
  });
});

describe("removeStudentFromCourse", () => {
  it("tar bort kommande bokningar, behåller passerade, återställer saldot och sparar borttagningen", async () => {
    const { a, b, product } = await termCard({ past: 2, future: 3 });
    const buyer = await createUser({ name: "Elev" });
    const { items } = await buy({ admin, buyer, product });
    const item = itemFor(items, a);
    await bookPastLessons(item);

    asAdmin(admin);
    await setCourseBooking(item.id, true);
    await setCourseBooking(itemFor(items, b).id, true);
    expect(await itemRemaining(item.id)).toBe(5);

    const result = await removeStudentFromCourse(a.id, userKey(buyer));
    expect(result.success).toBe(true);
    expect(result.msg).toContain("3 kommande bokningar");

    expect(await futureBookingCount(item.id)).toBe(0);
    expect(await bookingCount(item.id)).toBe(2);
    expect(await itemRemaining(item.id)).toBe(8);
    expect(await rosterEntry(a.id, userKey(buyer))).toMatchObject({
      status: "REMOVED",
      userId: buyer.id,
      participantId: null,
      changedByUserId: admin.id,
    });

    expect(keysOf(await getCourseRoster(a.id))).toEqual([]);
    expect(await getCourseStudentCounts([a.id])).toEqual({ [a.id]: 0 });

    // Andra kursen i kortet rörs inte.
    expect(await futureBookingCount(itemFor(items, b).id)).toBe(4);
    expect(keysOf(await getCourseRoster(b.id))).toEqual([userKey(buyer)]);
  });

  it("en autobokande kurs: eleven försvinner ur listan trots köpet", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });

    asTeacher(teacher);
    const result = await removeStudentFromCourse(course.id, userKey(buyer));
    expect(result.success).toBe(true);
    expect(await bookingCount(items[0].id)).toBe(0);
    expect(await itemRemaining(items[0].id)).toBe(10);
    expect(keysOf(await getCourseRoster(course.id))).toEqual([]);
  });

  it("klippkort: klippen går tillbaka till den gemensamma potten", async () => {
    const a = await createCourse({ teacher, future: 3 });
    const b = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "CLIP",
      courses: [a, b],
      totalCount: 10,
    });
    const buyer = await createUser();
    const { purchase, items } = await buy({ admin, buyer, product });

    asAdmin(admin);
    await setCourseBooking(itemFor(items, a).id, true);
    await setCourseBooking(itemFor(items, b).id, true);
    expect(await clipRemaining(purchase.id)).toBe(4);

    await removeStudentFromCourse(a.id, userKey(buyer));
    expect(await clipRemaining(purchase.id)).toBe(7);
    expect(await bookingCount(itemFor(items, b).id)).toBe(3);
  });

  it("deltagare och konto är olika elever: att ta bort kontot rör inte deltagaren", async () => {
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

    asAdmin(admin);
    await removeStudentFromCourse(course.id, userKey(buyer));
    expect(await bookingCount(own.items[0].id)).toBe(0);
    expect(await bookingCount(forChild.items[0].id)).toBe(3);
    expect(keysOf(await getCourseRoster(course.id))).toEqual([
      participantKey(child),
    ]);

    await removeStudentFromCourse(course.id, participantKey(child));
    expect(await bookingCount(forChild.items[0].id)).toBe(0);
    expect(await itemRemaining(forChild.items[0].id)).toBe(10);
    expect(keysOf(await getCourseRoster(course.id))).toEqual([]);
  });

  it("en manuellt tillagd elev utan köp: tillägget tas bort", async () => {
    const course = await createCourse({ teacher });
    const student = await createUser();

    asTeacher(teacher);
    await addStudentToCourse(course.id, userKey(student));
    expect((await rosterEntry(course.id, userKey(student)))?.status).toBe(
      "ADDED",
    );

    const result = await removeStudentFromCourse(course.id, userKey(student));
    expect(result.success).toBe(true);
    expect(await rosterEntry(course.id, userKey(student))).toBeNull();
    expect(keysOf(await getCourseRoster(course.id))).toEqual([]);
  });

  it("okänd nyckel och okänd elev", async () => {
    const course = await createCourse({ teacher });
    asAdmin(admin);
    expect(await removeStudentFromCourse(course.id, "skräp")).toEqual({
      success: false,
      msg: "Okänd elev.",
    });
    expect(await removeStudentFromCourse(course.id, "user:finns-inte")).toEqual(
      { success: false, msg: "Eleven hittades inte." },
    );
  });

  it("annan lärare, kund och utloggad får inte ta bort", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });

    for (const who of [
      () => asTeacher(otherTeacher),
      () => asUser(buyer),
      () => actAs(null),
    ]) {
      who();
      expect(await removeStudentFromCourse(course.id, userKey(buyer))).toEqual({
        success: false,
        msg: "Ingen behörighet.",
      });
    }
    expect(await bookingCount(items[0].id)).toBe(3);
    expect(await rosterEntry(course.id, userKey(buyer))).toBeNull();
  });

  // Granskningsfynd 3.
  it("[fynd 3] två samtidiga borttagningar återbetalar saldot bara en gång", async () => {
    const course = await createCourse({ teacher, future: 3 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      autobook: true,
    });
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    expect(await itemRemaining(items[0].id)).toBe(7);

    asAdmin(admin);
    await Promise.all([
      removeStudentFromCourse(course.id, userKey(buyer)),
      removeStudentFromCourse(course.id, userKey(buyer)),
    ]);
    expect(await bookingCount(items[0].id)).toBe(0);
    expect(await itemRemaining(items[0].id)).toBe(10);
  });
});

describe("addStudentToCourse", () => {
  it("admin lägger till en elev med köp: bokas in och borttagningen hävs", async () => {
    const { a, product } = await termCard({ future: 3 });
    const buyer = await createUser();
    const child = await createParticipant(buyer);
    const { items } = await buy({ admin, buyer, product, participant: child });
    const item = itemFor(items, a);

    asAdmin(admin);
    await setCourseBooking(item.id, true);
    await removeStudentFromCourse(a.id, participantKey(child));
    expect(keysOf(await getCourseRoster(a.id))).toEqual([]);

    const result = await addStudentToCourse(a.id, participantKey(child));
    expect(result.success).toBe(true);
    expect(result.msg).toContain("3 kommande lektioner");
    expect(await futureBookingCount(item.id)).toBe(3);
    expect(await itemRemaining(item.id)).toBe(7);
    expect(await rosterEntry(a.id, participantKey(child))).toBeNull();
    expect(keysOf(await getCourseRoster(a.id))).toEqual([
      participantKey(child),
    ]);
  });

  it("utan köp läggs eleven till för hand, utan bokningar", async () => {
    const course = await createCourse({ teacher });
    const parent = await createUser({ name: "Kunden" });
    const child = await createParticipant(parent, "Provare");

    asAdmin(admin);
    const result = await addStudentToCourse(course.id, participantKey(child));
    expect(result.success).toBe(true);
    expect(result.msg).toMatch(/utan köp/);

    const roster = await getCourseRoster(course.id);
    expect(roster?.students).toEqual([
      {
        studentKey: participantKey(child),
        name: "Provare",
        customerName: "Kunden",
        products: [],
        bookings: 0,
        addedManually: true,
        pending: false,
      },
    ]);
    expect(await getCourseStudentCounts([course.id])).toEqual({
      [course.id]: 1,
    });
  });

  it("admin med slut saldo: eleven läggs till för hand med förklaring", async () => {
    const { a, product } = await termCard();
    const buyer = await createUser();
    const { items } = await buy({ admin, buyer, product });
    await prisma.purchaseItem.update({
      where: { id: itemFor(items, a).id },
      data: { remainingCount: 0 },
    });

    asAdmin(admin);
    const result = await addStudentToCourse(a.id, userKey(buyer));
    expect(result.success).toBe(true);
    expect(result.msg).toMatch(/saldot är slut/);
    expect((await rosterEntry(a.id, userKey(buyer)))?.status).toBe("ADDED");
  });

  it("kursens lärare lägger till en elev för hand", async () => {
    const course = await createCourse({ teacher });
    const student = await createUser();

    asTeacher(teacher);
    const result = await addStudentToCourse(course.id, userKey(student));
    expect(result.success).toBe(true);
    expect(await rosterEntry(course.id, userKey(student))).toMatchObject({
      status: "ADDED",
      changedByUserId: teacher.id,
    });
  });

  it("annan lärare, kund och utloggad får inte lägga till", async () => {
    const course = await createCourse({ teacher });
    const student = await createUser();

    for (const who of [
      () => asTeacher(otherTeacher),
      () => asUser(student),
      () => actAs(null),
    ]) {
      who();
      expect(await addStudentToCourse(course.id, userKey(student))).toEqual({
        success: false,
        msg: "Ingen behörighet.",
      });
    }
    expect(await rosterEntry(course.id, userKey(student))).toBeNull();
  });

  // Granskningsfynd 6. REMOVED-raden raderades först, utanför transaktion.
  // Fallerar ett senare steg ska borttagningen stå kvar. Här fallerar
  // upserten för att den inloggade adminen inte finns i databasen
  // (changedByUserId har en främmande nyckel) — en konstgjord men enkel väg
  // till ett fel efter raderingen.
  it("[fynd 6] misslyckas tillägget står studions borttagning kvar", async () => {
    const course = await createCourse({ teacher });
    const student = await createUser();

    asAdmin(admin);
    await removeStudentFromCourse(course.id, userKey(student));
    expect((await rosterEntry(course.id, userKey(student)))?.status).toBe(
      "REMOVED",
    );

    actAs({ id: "admin-som-inte-finns", role: "admin" });
    // Felet blir ett svar till klienten, inte ett undantag som låser UI:t.
    expect(await addStudentToCourse(course.id, userKey(student))).toMatchObject(
      { success: false },
    );

    expect((await rosterEntry(course.id, userKey(student)))?.status).toBe(
      "REMOVED",
    );
  });
});

describe("searchStudentsForCourse", () => {
  it("hittar deltagare och konton och markerar vilka som har köp i kursen", async () => {
    const course = await createCourse({ teacher });
    const product = await createProduct({ type: "COURSE", courses: [course] });
    const tag = `Zorro${Date.now()}`;
    const withPurchase = await createUser({ name: `${tag} Köpare` });
    const without = await createUser({ name: `${tag} Utan` });
    const child = await createParticipant(without, `${tag} Barn`);
    await buy({ admin, buyer: withPurchase, product });

    asTeacher(teacher);
    const hits = await searchStudentsForCourse(course.id, tag.toLowerCase());
    const byKey = new Map(hits.map((h) => [h.studentKey, h]));
    expect([...byKey.keys()].sort()).toEqual(
      [userKey(withPurchase), userKey(without), participantKey(child)].sort(),
    );
    expect(byKey.get(userKey(withPurchase))?.hasPurchase).toBe(true);
    expect(byKey.get(userKey(without))?.hasPurchase).toBe(false);
    expect(byKey.get(participantKey(child))).toMatchObject({
      hasPurchase: false,
      detail: expect.stringContaining(`kund: ${tag} Utan`),
    });
  });

  it("kort sökning, annan lärare, kund och utloggad ger ingenting", async () => {
    const course = await createCourse({ teacher });
    const student = await createUser({ name: "Sökbar Person" });

    asAdmin(admin);
    expect(await searchStudentsForCourse(course.id, " s ")).toEqual([]);
    expect(
      (await searchStudentsForCourse(course.id, "Sökbar")).map(
        (h) => h.studentKey,
      ),
    ).toContain(userKey(student));

    for (const who of [
      () => asTeacher(otherTeacher),
      () => asUser(student),
      () => actAs(null),
    ]) {
      who();
      expect(await searchStudentsForCourse(course.id, "Sökbar")).toEqual([]);
    }
  });
});
