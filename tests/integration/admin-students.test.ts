import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  addStudentToCourse,
  removeStudentFromCourse,
} from "@/lib/actions/roster-actions";
import { loadStudentList, type StudentListFilters } from "@/lib/admin-students";
import prisma from "@/lib/prisma";
import {
  buy,
  createCourse,
  createParticipant,
  createProduct,
  createUser,
  placeOrder,
} from "../helpers/factories";
import {
  asAdmin,
  bookPastLessons,
  itemFor,
  participantKey,
  userKey,
} from "../helpers/roster";

type User = Awaited<ReturnType<typeof createUser>>;

let admin: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
});

/** Samma anrop som sidan gör: alla kurser skickas med, filtren kommer ur URL:en. */
async function list(filters: StudentListFilters) {
  const courses = await prisma.course.findMany({ orderBy: { name: "asc" } });
  return loadStudentList(filters, courses);
}

async function keys(filters: StudentListFilters) {
  return (await list(filters)).map((s) => s.studentKey).sort();
}

const sorted = (...k: string[]) => [...k].sort();
const token = () => `Zq${randomUUID().slice(0, 8)}`;

/**
 * Ett litet universum med egen lärare, så att andra testers data aldrig
 * hamnar i svaret: två kurser med varsin produkt.
 */
async function universe() {
  const teacher = await createUser({ role: "teacher" });
  const a = await createCourse({ teacher, future: 3 });
  const b = await createCourse({ teacher, future: 3 });
  const prodA = await createProduct({
    type: "COURSE",
    courses: [a],
    autobook: true,
  });
  const prodB = await createProduct({
    type: "COURSE",
    courses: [b],
    autobook: true,
  });
  asAdmin(admin);
  return { teacher, a, b, prodA, prodB };
}

describe("kurs-, produkt- och lärarfilter", () => {
  it("kurs ensam: bara de som köpt kursen", async () => {
    const u = await universe();
    const ann = await createUser();
    const bo = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await buy({ admin, buyer: bo, product: u.prodB });

    expect(await keys({ course: u.a.id })).toEqual([userKey(ann)]);
    expect(await keys({ course: u.b.id })).toEqual([userKey(bo)]);
  });

  it("produkt ensam: bara de som köpt produkten", async () => {
    const u = await universe();
    const ann = await createUser();
    const bo = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await buy({ admin, buyer: bo, product: u.prodB });

    expect(await keys({ product: u.prodA.id })).toEqual([userKey(ann)]);
    expect(await keys({ product: u.prodB.id })).toEqual([userKey(bo)]);
  });

  it("kurs + produkt: samma köp måste uppfylla båda", async () => {
    const u = await universe();
    const ann = await createUser();
    const bo = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await buy({ admin, buyer: bo, product: u.prodB });

    // Matchande par.
    expect(await keys({ course: u.a.id, product: u.prodA.id })).toEqual([
      userKey(ann),
    ]);
    // Kursen hör till en annan produkt: ingen kan matcha.
    expect(await keys({ course: u.a.id, product: u.prodB.id })).toEqual([]);
    expect(await keys({ course: u.b.id, product: u.prodA.id })).toEqual([]);
  });

  it("kurs + produkt: produkten från ett köp och kursen från ett annat räknas inte", async () => {
    const u = await universe();
    // Cecilia har köpt A (produkt A) och en separat produkt som bara gäller B.
    // Kurs A + produkt B får inte matcha bara för att hon har båda köpen.
    const cecilia = await createUser();
    await buy({ admin, buyer: cecilia, product: u.prodA });
    await buy({ admin, buyer: cecilia, product: u.prodB });

    expect(await keys({ course: u.a.id, product: u.prodA.id })).toEqual([
      userKey(cecilia),
    ]);
    expect(await keys({ course: u.b.id, product: u.prodB.id })).toEqual([
      userKey(cecilia),
    ]);
    // Produkten gäller bara kurs B, så kurs A + produkt B är tomt för alla.
    expect(await keys({ course: u.a.id, product: u.prodB.id })).toEqual([]);
  });

  it("kurs + produkt med terminskort: bara de som valt kursen och är inbokade", async () => {
    const teacher = await createUser({ role: "teacher" });
    const a = await createCourse({ teacher, past: 2, future: 2 });
    const b = await createCourse({ teacher, past: 2, future: 2 });
    const pack = await createProduct({
      type: "PACK",
      courses: [a, b],
      lessonsIncluded: 10,
      maxCourses: 1,
      autobook: false,
    });
    asAdmin(admin);

    const dora = await createUser();
    const bought = await buy({
      admin,
      buyer: dora,
      product: pack,
      selectedCourseIds: [a.id],
    });

    // Köpt men inte inbokad: räknas inte som elev på kursen.
    expect(await keys({ course: a.id, product: pack.id })).toEqual([]);
    expect(await keys({ product: pack.id })).toEqual([userKey(dora)]);

    // Efter bokning syns hen på kurs A men inte på B (valde bara A).
    await bookPastLessons(itemFor(bought.items, a));
    expect(await keys({ course: a.id, product: pack.id })).toEqual([
      userKey(dora),
    ]);
    expect(await keys({ course: b.id, product: pack.id })).toEqual([]);
  });

  it("lärare: alla som går på lärarens kurser, och lärare + kurs snittar", async () => {
    const u = await universe();
    const other = await createUser({ role: "teacher" });
    const foreign = await createCourse({ teacher: other, future: 2 });
    const foreignProd = await createProduct({
      type: "COURSE",
      courses: [foreign],
      autobook: true,
    });
    asAdmin(admin);

    const ann = await createUser();
    const bo = await createUser();
    const eli = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await buy({ admin, buyer: bo, product: u.prodB });
    await buy({ admin, buyer: eli, product: foreignProd });

    expect(await keys({ teacher: u.teacher.id })).toEqual(
      sorted(userKey(ann), userKey(bo)),
    );
    expect(await keys({ teacher: other.id })).toEqual([userKey(eli)]);
    // Kurs A hör till u.teacher: snittet är Ann.
    expect(await keys({ teacher: u.teacher.id, course: u.a.id })).toEqual([
      userKey(ann),
    ]);
    // Kurs A med fel lärare: tomt.
    expect(await keys({ teacher: other.id, course: u.a.id })).toEqual([]);
  });

  it("termin: väljer kurser via schemat", async () => {
    const u = await universe();
    const termin2 = await prisma.termin.create({
      data: {
        name: `Termin ${token()}`,
        startDate: new Date(Date.now() + 200 * 86400000),
        endDate: new Date(Date.now() + 300 * 86400000),
      },
    });
    const c = await createCourse({ teacher: u.teacher, future: 0 });
    await prisma.schemaItem.deleteMany({ where: { courseId: c.id } });
    await prisma.schemaItem.create({
      data: {
        weekday: "FRIDAY",
        timeStart: new Date("1970-01-01T17:00:00Z"),
        timeEnd: new Date("1970-01-01T18:00:00Z"),
        terminId: termin2.id,
        courseId: c.id,
      },
    });
    const prodC = await createProduct({
      type: "COURSE",
      courses: [c],
      autobook: false,
    });
    asAdmin(admin);

    const ann = await createUser();
    const fia = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await buy({ admin, buyer: fia, product: prodC });

    // Fia går via kurs C i termin 2.
    expect(await keys({ termin: termin2.id, teacher: u.teacher.id })).toEqual([
      userKey(fia),
    ]);
    // Och Ann syns inte där, eftersom hennes kurs ligger i en annan termin.
    expect(await keys({ termin: termin2.id })).not.toContain(userKey(ann));
  });
});

describe("status (godkänd / ej godkänd)", () => {
  it("ej godkänd: bara väntande ordrar; godkänd: bara beviljade köp", async () => {
    const u = await universe();
    const approvedBuyer = await createUser();
    const waiting = await createUser();
    await buy({ admin, buyer: approvedBuyer, product: u.prodA });
    await placeOrder({ buyer: waiting, product: u.prodA });

    expect(await keys({ course: u.a.id, approval: "approved" })).toEqual([
      userKey(approvedBuyer),
    ]);
    expect(await keys({ course: u.a.id, approval: "unapproved" })).toEqual([
      userKey(waiting),
    ]);
    expect(await keys({ course: u.a.id, approval: "all" })).toEqual(
      sorted(userKey(approvedBuyer), userKey(waiting)),
    );
  });

  it("okänt värde på approval tolkas som alla", async () => {
    const u = await universe();
    const waiting = await createUser();
    await placeOrder({ buyer: waiting, product: u.prodA });
    expect(await keys({ course: u.a.id, approval: "nonsens" })).toEqual([
      userKey(waiting),
    ]);
  });

  it("väntande order respekterar produkt- och kursfilter", async () => {
    const u = await universe();
    const waiting = await createUser();
    await placeOrder({ buyer: waiting, product: u.prodA });

    expect(await keys({ approval: "unapproved", product: u.prodA.id })).toEqual(
      [userKey(waiting)],
    );
    expect(await keys({ approval: "unapproved", product: u.prodB.id })).toEqual(
      [],
    );
    expect(await keys({ approval: "unapproved", course: u.b.id })).toEqual([]);
    expect(
      await keys({ approval: "unapproved", teacher: u.teacher.id }),
    ).toEqual([userKey(waiting)]);
  });

  it("en befintlig elev med en ny väntande order markeras både godkänd och väntande", async () => {
    const u = await universe();
    const ann = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await placeOrder({ buyer: ann, product: u.prodB });

    const [row] = await list({ approval: "unapproved", teacher: u.teacher.id });
    expect(row.studentKey).toBe(userKey(ann));
    expect(row.hasPendingOrder).toBe(true);
    expect(row.hasApprovedPurchase).toBe(true);
  });
});

describe("deltagare och kunder", () => {
  it("deltagare listas under sig själv, med kundens namn", async () => {
    const u = await universe();
    const parent = await createUser({ name: "Förälder" });
    const kid = await createParticipant(parent, "Barnet");
    await buy({ admin, buyer: parent, product: u.prodA, participant: kid });

    const rows = await list({ course: u.a.id });
    expect(rows.map((r) => r.studentKey)).toEqual([participantKey(kid)]);
    expect(rows[0].name).toBe("Barnet");
    expect(rows[0].customerName).toBe("Förälder");
  });

  it("föräldern och barnet är två olika elever, och kan gå på olika kurser", async () => {
    const u = await universe();
    const parent = await createUser();
    const kid = await createParticipant(parent);
    await buy({ admin, buyer: parent, product: u.prodA });
    await buy({ admin, buyer: parent, product: u.prodB, participant: kid });

    expect(await keys({ course: u.a.id })).toEqual([userKey(parent)]);
    expect(await keys({ course: u.b.id })).toEqual([participantKey(kid)]);
    expect(await keys({ teacher: u.teacher.id })).toEqual(
      sorted(userKey(parent), participantKey(kid)),
    );
  });

  it("sökning hittar barnet på kundens namn och kunden på barnets kurs", async () => {
    const u = await universe();
    const t = token();
    const parent = await createUser({ name: `Mamma ${t}` });
    const kid = await createParticipant(parent, `Barn ${token()}`);
    await buy({ admin, buyer: parent, product: u.prodA, participant: kid });

    expect(await keys({ q: t })).toEqual([participantKey(kid)]);
    expect(await keys({ q: t.toLowerCase() })).toEqual([participantKey(kid)]);
    expect(await keys({ q: `${t}finnsinte` })).toEqual([]);
  });
});

describe("manuellt tillagda elever", () => {
  it("syns under kurs- och lärarfiltret, men inte under produkt eller ej godkänd", async () => {
    const u = await universe();
    const maja = await createUser({ name: `Maja ${token()}` });
    const mio = await createParticipant(maja, `Mio ${token()}`);
    asAdmin(admin);
    expect((await addStudentToCourse(u.a.id, userKey(maja))).success).toBe(
      true,
    );
    expect(
      (await addStudentToCourse(u.a.id, participantKey(mio))).success,
    ).toBe(true);

    expect(await keys({ course: u.a.id })).toEqual(
      sorted(userKey(maja), participantKey(mio)),
    );
    expect(await keys({ teacher: u.teacher.id })).toEqual(
      sorted(userKey(maja), participantKey(mio)),
    );
    expect(await keys({ course: u.b.id })).toEqual([]);

    // Inget köp och ingen order.
    expect(await keys({ course: u.a.id, product: u.prodA.id })).toEqual([]);
    expect(await keys({ course: u.a.id, approval: "unapproved" })).toEqual([]);
    // Utan kurs- eller lärarfilter listas de inte alls (listan utgår från köp).
    expect(await keys({ product: u.prodA.id })).toEqual([]);
  });

  it("räknas som godkända (de har ingen väntande order)", async () => {
    const u = await universe();
    const maja = await createUser();
    asAdmin(admin);
    await addStudentToCourse(u.a.id, userKey(maja));

    expect(await keys({ course: u.a.id, approval: "approved" })).toEqual([
      userKey(maja),
    ]);
  });

  it("markeras addedManually och visar kursen", async () => {
    const u = await universe();
    const maja = await createUser();
    asAdmin(admin);
    await addStudentToCourse(u.a.id, userKey(maja));

    const [row] = await list({ course: u.a.id });
    expect(row.addedManually).toBe(true);
    expect(row.courses.map((c) => c.id)).toEqual([u.a.id]);
    expect(row.purchases).toEqual([]);
  });

  it("följer termin- och sökfilter", async () => {
    const u = await universe();
    const t = token();
    const maja = await createUser({ name: `Maja ${t}` });
    const nils = await createUser({ name: `Nils ${token()}` });
    asAdmin(admin);
    await addStudentToCourse(u.a.id, userKey(maja));
    await addStudentToCourse(u.a.id, userKey(nils));

    const termin = (
      await prisma.schemaItem.findFirstOrThrow({
        where: { courseId: u.a.id },
        select: { terminId: true },
      })
    ).terminId;
    const otherTermin = await prisma.termin.create({
      data: {
        name: `Annan ${token()}`,
        startDate: new Date(Date.now() + 400 * 86400000),
        endDate: new Date(Date.now() + 500 * 86400000),
      },
    });

    expect(await keys({ course: u.a.id, termin })).toEqual(
      sorted(userKey(maja), userKey(nils)),
    );
    expect(await keys({ course: u.a.id, termin: otherTermin.id })).toEqual([]);
    expect(await keys({ course: u.a.id, q: t })).toEqual([userKey(maja)]);
    // Sökning på kursnamn matchar också tilläggen.
    const courseName = (
      await prisma.course.findUniqueOrThrow({ where: { id: u.a.id } })
    ).name;
    expect(await keys({ course: u.a.id, q: courseName })).toEqual(
      sorted(userKey(maja), userKey(nils)),
    );
  });

  it("en elev som både köpt och lagts till visas bara en gång", async () => {
    const u = await universe();
    const ann = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    asAdmin(admin);
    await addStudentToCourse(u.a.id, userKey(ann));

    expect(await keys({ course: u.a.id })).toEqual([userKey(ann)]);
  });

  it("en elev som köpt kursen A och lagts till på B syns under båda", async () => {
    const u = await universe();
    const ann = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    asAdmin(admin);
    await addStudentToCourse(u.b.id, userKey(ann));

    expect(await keys({ course: u.a.id })).toEqual([userKey(ann)]);
    expect(await keys({ course: u.b.id })).toEqual([userKey(ann)]);
    // Produkt A hör bara till kurs A.
    expect(await keys({ course: u.b.id, product: u.prodA.id })).toEqual([]);
  });
});

describe("borttagna elever", () => {
  it("en borttagning vinner över köpet i kurs- och lärarfiltret", async () => {
    const u = await universe();
    const ann = await createUser();
    const bo = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await buy({ admin, buyer: bo, product: u.prodA });
    asAdmin(admin);
    expect((await removeStudentFromCourse(u.a.id, userKey(ann))).success).toBe(
      true,
    );

    expect(await keys({ course: u.a.id })).toEqual([userKey(bo)]);
    expect(await keys({ teacher: u.teacher.id })).toEqual([userKey(bo)]);
  });

  it("men köpet finns kvar under produktfiltret", async () => {
    const u = await universe();
    const ann = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    asAdmin(admin);
    await removeStudentFromCourse(u.a.id, userKey(ann));

    // Produktfiltret utgår från köp, inte från deltagarlistan.
    expect(await keys({ product: u.prodA.id })).toEqual([userKey(ann)]);
    const [row] = await list({ product: u.prodA.id });
    expect(row.courses).toEqual([]);
  });

  it("tas hen bort från den ena av två kurser syns hen kvar på den andra", async () => {
    const u = await universe();
    const ann = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });
    await buy({ admin, buyer: ann, product: u.prodB });
    asAdmin(admin);
    await removeStudentFromCourse(u.a.id, userKey(ann));

    expect(await keys({ course: u.a.id })).toEqual([]);
    expect(await keys({ course: u.b.id })).toEqual([userKey(ann)]);
  });

  it("tas ett manuellt tillägg bort försvinner hen från listan", async () => {
    const u = await universe();
    const maja = await createUser();
    asAdmin(admin);
    await addStudentToCourse(u.a.id, userKey(maja));
    expect(await keys({ course: u.a.id })).toEqual([userKey(maja)]);

    await removeStudentFromCourse(u.a.id, userKey(maja));
    expect(await keys({ course: u.a.id })).toEqual([]);
  });
});

describe("filter utan träff och utan filter", () => {
  it("okänt kurs-id ger tom lista", async () => {
    expect(await keys({ course: "finns-inte" })).toEqual([]);
  });

  it("tomma strängar räknas som inget filter", async () => {
    const u = await universe();
    const ann = await createUser();
    await buy({ admin, buyer: ann, product: u.prodA });

    const all = await keys({});
    expect(all).toContain(userKey(ann));
    expect(
      await keys({
        q: "",
        teacher: "",
        termin: "",
        course: "",
        product: "",
        approval: "",
      }),
    ).toEqual(all);
  });
});
