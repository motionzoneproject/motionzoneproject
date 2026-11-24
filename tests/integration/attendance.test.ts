// Närvaroregistret: vem som får läsa och spara närvaro på en lektion, att
// saveAttendance sparar och skriver över rätt, och att kunden bara ser sin
// egen närvaro på lektioner som blev av.

import { beforeAll, describe, expect, it } from "vitest";
import {
  getAttendanceCalendar,
  getAttendanceDay,
  getBookingAttendance,
  getLessonAttendance,
  getLessonBookings,
  getMyAttendance,
  getMyAttendanceInRange,
  saveAttendance,
} from "@/lib/actions/attendance-actions";
import { addStudentToCourse } from "@/lib/actions/roster-actions";
import { getAttendanceFollowUp } from "@/lib/admin-overview";
import { formatDateToInputStr } from "@/lib/date-utils";
import prisma from "@/lib/prisma";
import {
  buy,
  createCourse,
  createParticipant,
  createProduct,
  createUser,
} from "../helpers/factories";
import {
  asAdmin,
  asTeacher,
  asUser,
  participantKey,
  userKey,
} from "../helpers/roster";

type User = Awaited<ReturnType<typeof createUser>>;

const DAY = 24 * 60 * 60 * 1000;

let admin: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
});

/**
 * En kurs med en passerad lektion och två elever: kunden själv och kundens
 * barn, båda via ett köp utan autobokning.
 */
async function lessonWithStudents(teacher: { id: string }) {
  const course = await createCourse({ teacher, past: 1, future: 1 });
  const product = await createProduct({ type: "COURSE", courses: [course] });
  const parent = await createUser({ name: "Förälder" });
  const child = await createParticipant(parent, "Barn");
  await buy({ admin, buyer: parent, product });
  await buy({ admin, buyer: parent, product, participant: child });

  const lesson = await prisma.lesson.findFirstOrThrow({
    where: { courseId: course.id, startTime: { lt: new Date() } },
  });
  return { course, lesson, parent, child };
}

async function marksOn(lessonId: string) {
  const rows = await prisma.attendance.findMany({
    where: { lessonId },
    select: { studentKey: true, status: true, markedByUserId: true },
  });
  return Object.fromEntries(rows.map((r) => [r.studentKey, r]));
}

describe("behörighet mellan lärare", () => {
  it("lärare X kommer inte åt lärare Y:s lektion", async () => {
    const x = await createUser({ role: "teacher" });
    const y = await createUser({ role: "teacher" });
    const { lesson, parent } = await lessonWithStudents(y);

    asTeacher(x);
    expect(await getLessonAttendance(lesson.id)).toBeNull();
    expect(await getLessonBookings(lesson.id)).toBeNull();
    expect(await getBookingAttendance(lesson.id)).toEqual({
      taken: false,
      byStudentKey: {},
      presentWithoutBooking: [],
    });
    const saved = await saveAttendance(lesson.id, [
      { studentKey: userKey(parent), present: true },
    ]);
    expect(saved.success).toBe(false);
    expect(await marksOn(lesson.id)).toEqual({});

    // Dagsvyn visar bara lärarens egna lektioner, även om en annan lärare
    // skickas med.
    const day = await getAttendanceDay(
      formatDateToInputStr(lesson.startTime),
      y.id,
    );
    expect(day.map((l) => l.lessonId)).not.toContain(lesson.id);
  });

  it("kursens lärare, lektionens lärare (vikarie) och admin kommer åt den", async () => {
    const owner = await createUser({ role: "teacher" });
    const substitute = await createUser({ role: "teacher" });
    const { lesson, parent, child } = await lessonWithStudents(owner);
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { teacherId: substitute.id },
    });

    for (const [who, login] of [
      [owner, asTeacher],
      [substitute, asTeacher],
      [admin, asAdmin],
    ] as const) {
      login(who);
      const read = await getLessonAttendance(lesson.id);
      expect(read?.students.map((s) => s.studentKey).sort()).toEqual(
        [participantKey(child), userKey(parent)].sort(),
      );
      // Elevlistan i admin/students är bara för admin.
      expect(read?.showStudentList).toBe(who === admin);
      expect((await getLessonBookings(lesson.id))?.courseName).toBeTruthy();
      const saved = await saveAttendance(lesson.id, [
        { studentKey: userKey(parent), present: true },
      ]);
      expect(saved.success).toBe(true);
    }
  });

  it("en kund kommer inte åt lärarnas närvaro", async () => {
    const teacher = await createUser({ role: "teacher" });
    const { lesson, parent } = await lessonWithStudents(teacher);

    asUser(parent);
    expect(await getLessonAttendance(lesson.id)).toBeNull();
    expect(await getLessonBookings(lesson.id)).toBeNull();
    expect(
      (
        await saveAttendance(lesson.id, [
          { studentKey: userKey(parent), present: true },
        ])
      ).success,
    ).toBe(false);
  });
});

describe("saveAttendance", () => {
  it("sparar, och skriver över en tidigare markering", async () => {
    const teacher = await createUser({ role: "teacher" });
    const { lesson, parent, child } = await lessonWithStudents(teacher);
    asTeacher(teacher);

    const first = await saveAttendance(lesson.id, [
      { studentKey: userKey(parent), present: true },
      { studentKey: participantKey(child), present: false },
    ]);
    expect(first).toEqual({
      success: true,
      msg: "Närvaron är sparad: 1 av 2 närvarande.",
    });
    let marks = await marksOn(lesson.id);
    expect(marks[userKey(parent)]?.status).toBe("PRESENT");
    expect(marks[participantKey(child)]?.status).toBe("ABSENT");

    // Bara en ändring skickas; den andra markeringen ligger kvar.
    asAdmin(admin);
    const second = await saveAttendance(lesson.id, [
      { studentKey: participantKey(child), present: true },
    ]);
    expect(second.msg).toBe("Närvaron är sparad: 2 av 2 närvarande.");
    marks = await marksOn(lesson.id);
    expect(marks[participantKey(child)]).toEqual({
      studentKey: participantKey(child),
      status: "PRESENT",
      markedByUserId: admin.id,
    });
    expect(marks[userKey(parent)]?.markedByUserId).toBe(teacher.id);
    expect(
      await prisma.attendance.count({ where: { lessonId: lesson.id } }),
    ).toBe(2);
  });

  it("onlyIfUnmarked skriver inte över någon annans markering", async () => {
    const teacher = await createUser({ role: "teacher" });
    const { lesson, parent, child } = await lessonWithStudents(teacher);

    // Admin bockar i barnet medan läraren har listan öppen.
    asAdmin(admin);
    await saveAttendance(lesson.id, [
      { studentKey: participantKey(child), present: true },
    ]);

    // Läraren sparar sin lista: barnet var omarkerat när hen laddade den.
    asTeacher(teacher);
    await saveAttendance(lesson.id, [
      { studentKey: userKey(parent), present: true },
      {
        studentKey: participantKey(child),
        present: false,
        onlyIfUnmarked: true,
      },
    ]);

    const marks = await marksOn(lesson.id);
    expect(marks[participantKey(child)]?.status).toBe("PRESENT");
    expect(marks[userKey(parent)]?.status).toBe("PRESENT");

    // En omarkerad elev blir frånvarande.
    const other = await lessonWithStudents(teacher);
    await saveAttendance(other.lesson.id, [
      {
        studentKey: userKey(other.parent),
        present: false,
        onlyIfUnmarked: true,
      },
    ]);
    expect(
      (await marksOn(other.lesson.id))[userKey(other.parent)]?.status,
    ).toBe("ABSENT");
  });

  it("nekar elever som inte står på listan, inställda lektioner och ogiltig indata", async () => {
    const teacher = await createUser({ role: "teacher" });
    const { lesson, parent } = await lessonWithStudents(teacher);
    const stranger = await createUser();
    asTeacher(teacher);

    expect(
      (
        await saveAttendance(lesson.id, [
          { studentKey: userKey(stranger), present: true },
        ])
      ).success,
    ).toBe(false);
    expect(
      (await saveAttendance(lesson.id, [{ studentKey: "hack", present: true }]))
        .success,
    ).toBe(false);
    expect(
      (
        await saveAttendance("", [
          { studentKey: userKey(parent), present: true },
        ])
      ).success,
    ).toBe(false);
    expect(await marksOn(lesson.id)).toEqual({});

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { cancelled: true },
    });
    const cancelled = await saveAttendance(lesson.id, [
      { studentKey: userKey(parent), present: true },
    ]);
    expect(cancelled).toEqual({
      success: false,
      msg: "Lektionen är inställd.",
    });
    expect(await marksOn(lesson.id)).toEqual({});
  });
});

describe("dagsvyn", () => {
  it("ger flera lektioner samma dag med rätt elever, och ogiltigt datum ger tomt", async () => {
    const teacher = await createUser({ role: "teacher" });
    const a = await lessonWithStudents(teacher);
    const b = await lessonWithStudents(teacher);
    // Lägg b:s lektion samma dag som a:s.
    await prisma.lesson.update({
      where: { id: b.lesson.id },
      data: { startTime: a.lesson.startTime, endTime: a.lesson.endTime },
    });
    asTeacher(teacher);

    const day = await getAttendanceDay(
      formatDateToInputStr(a.lesson.startTime),
    );
    const byId = new Map(day.map((l) => [l.lessonId, l]));
    expect(
      byId
        .get(a.lesson.id)
        ?.students.map((s) => s.studentKey)
        .sort(),
    ).toEqual([participantKey(a.child), userKey(a.parent)].sort());
    expect(
      byId
        .get(b.lesson.id)
        ?.students.map((s) => s.studentKey)
        .sort(),
    ).toEqual([participantKey(b.child), userKey(b.parent)].sort());

    expect(await getAttendanceDay("2026-02-30")).toEqual([]);
    expect(await getAttendanceDay("inte-ett-datum")).toEqual([]);
  });

  it("kalendern nekar för långa intervall", async () => {
    asAdmin(admin);
    expect(await getAttendanceCalendar("2026-01-01", "2026-12-31")).toEqual({});
    expect(await getAttendanceCalendar("2026-03-01", "2026-02-01")).toEqual({});
  });
});

describe("uppföljningen", () => {
  it("flaggar en lektion vars elever bara lagts till för hand", async () => {
    const teacher = await createUser({ role: "teacher" });
    // Närvaro togs första gången för länge sedan, så lektionen räknas.
    const old = await lessonWithStudents(teacher);
    await prisma.attendance.create({
      data: {
        lessonId: old.lesson.id,
        studentKey: userKey(old.parent),
        userId: old.parent.id,
        status: "PRESENT",
        markedByUserId: teacher.id,
        createdAt: new Date(Date.now() - 60 * DAY),
      },
    });

    const course = await createCourse({ teacher, past: 1, future: 0 });
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { courseId: course.id },
    });
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        startTime: new Date(Date.now() - 2 * DAY),
        endTime: new Date(Date.now() - 2 * DAY + 60 * 60 * 1000),
      },
    });
    const walkIn = await createUser();
    asAdmin(admin);
    expect((await addStudentToCourse(course.id, userKey(walkIn))).success).toBe(
      true,
    );
    expect(await prisma.booking.count({ where: { lessonId: lesson.id } })).toBe(
      0,
    );

    const followUp = await getAttendanceFollowUp(new Date(), teacher.id);
    expect(followUp.find((f) => f.lesson.id === lesson.id)?.notTaken).toBe(
      true,
    );
  });
});

describe("kundens närvaro", () => {
  it("visar inte närvaro på inställda lektioner, och nekar för långa intervall", async () => {
    const teacher = await createUser({ role: "teacher" });
    const { lesson, parent } = await lessonWithStudents(teacher);
    asTeacher(teacher);
    await saveAttendance(lesson.id, [
      { studentKey: userKey(parent), present: true },
    ]);

    asUser(parent);
    expect((await getMyAttendance()).total).toBe(1);
    const date = formatDateToInputStr(lesson.startTime);
    expect(await getMyAttendanceInRange(date, date)).toHaveLength(1);
    expect(await getMyAttendanceInRange("2020-01-01", "2030-01-01")).toEqual(
      [],
    );

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { cancelled: true },
    });
    expect(await getMyAttendance()).toEqual({
      items: [],
      total: 0,
      present: 0,
    });
    expect(await getMyAttendanceInRange(date, date)).toEqual([]);
  });
});
