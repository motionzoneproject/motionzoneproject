"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import {
  attendanceStartedAt,
  compareLesson,
  compareLessonInclude,
  enrolledCounts,
} from "@/lib/attendance-compare";
import { studentKeyOf } from "@/lib/course-roster";
import { collectRosters } from "@/lib/course-roster-data";
import {
  calculateAge,
  endOfStockholmDateInput,
  formatDateToInputStr,
  parseStockholmDateInput,
} from "@/lib/date-utils";
import { MY_ATTENDANCE_PAGE } from "@/lib/my-attendance-page";
import {
  contactForParticipant,
  contactForUser,
  NO_CONTACT,
  participantBirthDate,
  type StudentContact,
} from "@/lib/student-contact";
import { getCourseName } from "@/lib/tools";
import prisma from "../prisma";
import {
  type BookingWithUserAndParticipant,
  getBookings,
  getUsersWithPurchasedProductsWithCourseInIt,
  type StudentWithPurchaseItemsWithCourse,
} from "./admin";
import { calcRemainingCount, hasRemainingCount } from "./purchase-helpers";
import { getSessionData } from "./sessiondata";

type Result = { success: boolean; msg: string };

// Server actions är publika endpoints, så argumenten valideras här och inte
// bara i formulären. z.iso.date() underkänner även datum som inte finns,
// som 2026-02-30.
const dateInputSchema = z.iso.date();
const idSchema = z.string().min(1).max(100);

/** Kalendrarna visar högst sex veckor; lite marginal, men inte hela åren. */
const MAX_RANGE_DAYS = 62;
const dateRangeSchema = z
  .object({ from: dateInputSchema, to: dateInputSchema })
  .refine(
    ({ from, to }) => {
      const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
      return days >= 0 && days <= MAX_RANGE_DAYS;
    },
    { message: `Högst ${MAX_RANGE_DAYS} dagar, och från före till.` },
  );

const marksSchema = z
  .array(
    z.object({
      studentKey: z
        .string()
        .regex(/^(participant|user):\S+$/)
        .max(200),
      present: z.boolean(),
      /**
       * Sätts för en elev som inte bockats i och inte hade någon markering:
       * "frånvarande" skrivs bara om ingen annan hunnit markera eleven.
       */
      onlyIfUnmarked: z.boolean().optional(),
    }),
  )
  .max(1000);

export type AttendanceMark = z.input<typeof marksSchema>[number];

export type AttendanceStudent = {
  studentKey: string;
  userId: string | null;
  participantId: string | null;
  name: string;
  customerName: string | null;
  /** Har en bokning på lektionen. Bara upplysning — närvaron rör den inte. */
  booked: boolean;
  /**
   * Står bara med på en order som väntar på godkännande. Eleven får vara
   * med, men läraren ska se att köpet inte är klart.
   */
  pending: boolean;
  /**
   * Står i kursens elevlista. Den som inte gör det finns med för att hen
   * redan har en markering på lektionen — till exempel en elev som tagits
   * bort från kursen efteråt.
   */
  inCourse: boolean;
  /**
   * Vem läraren ringer eller mejlar om eleven. För ett barn är det oftast
   * förälderns uppgifter, och då är `viaCustomer` satt.
   */
  contact: StudentContact;
  /** Elevens egen ålder, aldrig kontohavarens. Null om födelsedatum saknas. */
  age: number | null;
  status: AttendanceStatus | null;
};

/** Eleven utan kontaktuppgifter och ålder, som saveAttendance behöver. */
type RosterAttendanceStudent = Omit<AttendanceStudent, "contact" | "age">;

export type AttendanceLesson = {
  lessonId: string;
  courseId: string;
  courseName: string;
  studioName: string | null;
  teacherName: string;
  startTime: Date;
  endTime: Date;
  cancelled: boolean;
  message: string | null;
  /** Alla bokningar på lektionen, för knappen till bokningsdialogen. */
  bookingCount: number;
  students: AttendanceStudent[];
};

const lessonSelect = {
  id: true,
  startTime: true,
  endTime: true,
  cancelled: true,
  message: true,
  courseId: true,
  teacherId: true,
  course: {
    select: {
      teacherId: true,
      name: true,
      minAge: true,
      maxAge: true,
      adult: true,
      level: true,
    },
  },
  teacher: { select: { name: true } },
  schemaItem: { select: { studio: { select: { name: true } } } },
  _count: { select: { bookings: true } },
} as const;

type LessonRow = Prisma.LessonGetPayload<{ select: typeof lessonSelect }>;

async function requireTeacherOrAdmin() {
  const session = await getSessionData();
  if (!session) return null;
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return null;
  }
  return session;
}

/** Admin, lektionens lärare eller kursens lärare. */
function mayTakeAttendance(
  session: { user: { id: string; role?: string | null } },
  lesson: { teacherId: string; course: { teacherId: string | null } },
) {
  return (
    session.user.role === "admin" ||
    lesson.teacherId === session.user.id ||
    lesson.course.teacherId === session.user.id
  );
}

/**
 * Elevlistorna för en eller flera lektioner, per lektions-id.
 *
 * Kursens elever — samma lista som "Hantera elever" och elevlistan filtrerad
 * på kursen. Bokningarna spelar ingen roll här: närvaron är ett eget register.
 * Utöver kursens elever står den med som redan har en markering på
 * lektionen, så att en elev som tagits bort från kursen efteråt inte
 * försvinner ur de lektioner hen faktiskt gick.
 *
 * Tre frågor oavsett hur många lektioner det är, så att en hel dag inte
 * kostar frågor per lektion.
 */
async function lessonStudents(
  lessons: { id: string; courseId: string }[],
): Promise<Map<string, RosterAttendanceStudent[]>> {
  if (lessons.length === 0) return new Map();
  const lessonIds = lessons.map((l) => l.id);

  const [rosters, marks, bookings] = await Promise.all([
    collectRosters([...new Set(lessons.map((l) => l.courseId))]),
    prisma.attendance.findMany({
      where: { lessonId: { in: lessonIds } },
      select: {
        lessonId: true,
        studentKey: true,
        status: true,
        userId: true,
        participantId: true,
        user: { select: { name: true } },
        participant: {
          select: { name: true, addedBy: { select: { name: true } } },
        },
      },
    }),
    prisma.booking.findMany({
      where: { lessonId: { in: lessonIds }, cancelled: false },
      select: {
        lessonId: true,
        purchaseItem: {
          select: {
            purchase: { select: { userId: true, participantId: true } },
          },
        },
      },
    }),
  ]);

  const result = new Map<string, RosterAttendanceStudent[]>();
  for (const lesson of lessons) {
    const lessonMarks = marks.filter((m) => m.lessonId === lesson.id);
    const bookedKeys = new Set(
      bookings
        .filter((b) => b.lessonId === lesson.id)
        .map((b) => studentKeyOf(b.purchaseItem.purchase)),
    );
    const statusByKey = new Map(
      lessonMarks.map((m) => [m.studentKey, m.status]),
    );
    const students = new Map<string, RosterAttendanceStudent>();

    for (const s of rosters.get(lesson.courseId)?.values() ?? []) {
      students.set(s.studentKey, {
        studentKey: s.studentKey,
        userId: s.userId,
        participantId: s.participantId,
        name: s.name,
        customerName: s.customerName,
        booked: false,
        pending: s.pending,
        inCourse: true,
        status: null,
      });
    }

    for (const mark of lessonMarks) {
      if (students.has(mark.studentKey)) continue;
      const name = mark.participant?.name ?? mark.user?.name;
      if (!name) continue;
      students.set(mark.studentKey, {
        studentKey: mark.studentKey,
        userId: mark.userId,
        participantId: mark.participantId,
        name,
        customerName: mark.participant?.addedBy.name ?? null,
        booked: false,
        pending: false,
        inCourse: false,
        status: null,
      });
    }

    result.set(
      lesson.id,
      [...students.values()]
        .map((s) => ({
          ...s,
          booked: bookedKeys.has(s.studentKey),
          status: statusByKey.get(s.studentKey) ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
    );
  }
  return result;
}

const accountContactSelect = {
  email: true,
  details: { select: { phoneNumber: true } },
} as const;

/** Elevens eget konto: kontaktuppgifter och födelsedatum. */
const ownAccountSelect = {
  email: true,
  details: { select: { phoneNumber: true, dateOfBirth: true } },
} as const;

/**
 * Hämtar kontaktuppgifter och ålder för eleverna, med två frågor oavsett hur
 * många elever och lektioner det är, och ger en funktion som lägger till dem
 * på en elev. Samma elev kan stå på flera lektioner; hen hämtas en gång.
 *
 * Kontohavaren (addedBy) hämtas utan födelsedatum, så att en förälders ålder
 * inte kan hamna på barnet ens av misstag.
 *
 * Hålls utanför lessonStudents, eftersom saveAttendance bara behöver veta
 * vilka som står på listan.
 */
async function contactAndAge(
  students: RosterAttendanceStudent[],
): Promise<(student: RosterAttendanceStudent) => AttendanceStudent> {
  const participantIds = [
    ...new Set(
      students.flatMap((s) => (s.participantId ? [s.participantId] : [])),
    ),
  ];
  const userIds = [
    ...new Set(
      students.flatMap((s) => (!s.participantId && s.userId ? [s.userId] : [])),
    ),
  ];

  const [participants, users] = await Promise.all([
    participantIds.length
      ? prisma.participant.findMany({
          where: { id: { in: participantIds } },
          select: {
            id: true,
            phone: true,
            email: true,
            dateOfBirth: true,
            user: { select: ownAccountSelect },
            addedBy: { select: accountContactSelect },
          },
        })
      : [],
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, ...ownAccountSelect },
        })
      : [],
  ]);

  const participantById = new Map(participants.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  return (s) => {
    // En deltagare har sina egna uppgifter. userId är då köparens konto, så
    // det används bara för den som själv är eleven.
    const participant = s.participantId
      ? participantById.get(s.participantId)
      : undefined;
    const user =
      !s.participantId && s.userId ? userById.get(s.userId) : undefined;

    const contact = participant
      ? contactForParticipant(participant)
      : user
        ? contactForUser(user)
        : NO_CONTACT;

    const dateOfBirth = participant
      ? participantBirthDate(participant)
      : (user?.details?.dateOfBirth ?? null);

    return { ...s, contact, age: calculateAge(dateOfBirth) };
  };
}

/** Lektionerna med elevlistor, kontaktuppgifter och ålder. */
async function toAttendanceLessons(
  lessons: LessonRow[],
): Promise<AttendanceLesson[]> {
  const studentsByLesson = await lessonStudents(lessons);
  const withContact = await contactAndAge(
    [...studentsByLesson.values()].flat(),
  );

  return lessons.map((lesson) => ({
    lessonId: lesson.id,
    courseId: lesson.courseId,
    courseName: getCourseName(lesson.course),
    studioName: lesson.schemaItem.studio?.name ?? null,
    teacherName: lesson.teacher.name,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    cancelled: lesson.cancelled,
    message: lesson.message,
    bookingCount: lesson._count.bookings,
    students: (studentsByLesson.get(lesson.id) ?? []).map(withContact),
  }));
}

/**
 * Dagens lektioner med elevlista och redan satt närvaro.
 *
 * En lärare ser sina egna lektioner — de hen håller och de i hens kurser. En
 * admin ser alla, eller en viss lärares om teacherId anges.
 *
 * @auth Admin eller lärare
 */
export async function getAttendanceDay(
  dateInput: string,
  teacherId?: string,
): Promise<AttendanceLesson[]> {
  const session = await requireTeacherOrAdmin();
  if (!session) return [];

  if (
    !dateInputSchema.safeParse(dateInput).success ||
    !idSchema.optional().safeParse(teacherId).success
  )
    return [];

  const scopedTeacherId =
    session.user.role === "teacher" ? session.user.id : teacherId;

  const lessons = await prisma.lesson.findMany({
    where: {
      startTime: {
        gte: parseStockholmDateInput(dateInput),
        lte: endOfStockholmDateInput(dateInput),
      },
      ...(scopedTeacherId
        ? {
            OR: [
              { teacherId: scopedTeacherId },
              { course: { teacherId: scopedTeacherId } },
            ],
          }
        : {}),
    },
    orderBy: { startTime: "asc" },
    select: lessonSelect,
  });

  return toAttendanceLessons(lessons);
}

/** Hur en dag ser ut i närvarokalendern. */
export type AttendanceDayStatus = {
  /**
   * Röd: en avslutad lektion har elever men ingen närvaro. Grön:
   * närvaron är tagen. Rött väger tyngst — det är det som behöver göras.
   */
  ring: "red" | "green" | null;
  /** Närvaron som är tagen stämmer med bokningarna (grön) eller inte (orange). */
  fill: "green" | "orange" | null;
};

/**
 * Närvarons läge per dag för kalendern på närvarosidan.
 *
 * Samma jämförelse som översiktens "Stäm av närvaro". En lektion som inte
 * är slut ännu räknas inte som saknad — närvaron kan fortfarande tas — och
 * inte heller en från innan närvaro togs första gången.
 *
 * @auth Admin eller lärare. En lärare ser bara sina egna lektioner.
 */
export async function getAttendanceCalendar(
  fromDate: string,
  toDate: string,
  teacherId?: string,
): Promise<Record<string, AttendanceDayStatus>> {
  const session = await requireTeacherOrAdmin();
  if (!session) return {};

  if (
    !dateRangeSchema.safeParse({ from: fromDate, to: toDate }).success ||
    !idSchema.optional().safeParse(teacherId).success
  )
    return {};

  const scopedTeacherId =
    session.user.role === "teacher" ? session.user.id : teacherId;

  const lessons = await prisma.lesson.findMany({
    where: {
      cancelled: false,
      startTime: {
        gte: parseStockholmDateInput(fromDate),
        lte: endOfStockholmDateInput(toDate),
      },
      ...(scopedTeacherId
        ? {
            OR: [
              { teacherId: scopedTeacherId },
              { course: { teacherId: scopedTeacherId } },
            ],
          }
        : {}),
    },
    select: {
      startTime: true,
      endTime: true,
      courseId: true,
      ...compareLessonInclude,
    },
  });

  const now = Date.now();
  const [startedAt, enrolled] = await Promise.all([
    attendanceStartedAt(),
    enrolledCounts(lessons.map((l) => l.courseId)),
  ]);
  const since = startedAt?.getTime() ?? null;
  const days: Record<
    string,
    { missing: boolean; taken: boolean; mismatch: boolean }
  > = {};

  for (const lesson of lessons) {
    const key = formatDateToInputStr(lesson.startTime);
    days[key] ??= { missing: false, taken: false, mismatch: false };
    const day = days[key];
    const result = compareLesson(lesson, enrolled.get(lesson.courseId));

    // Saknas först när lektionen är slut, som i översiktens uppföljning:
    // under lektionen hinner läraren fortfarande ta närvaron.
    const start = lesson.startTime.getTime();
    const ended = lesson.endTime.getTime() < now;
    if (result.notTaken && ended && since !== null && start >= since)
      day.missing = true;
    if (result.taken) day.taken = true;
    if (result.mismatch) day.mismatch = true;
  }

  return Object.fromEntries(
    Object.entries(days)
      .filter(([, d]) => d.missing || d.taken)
      .map(([key, d]) => [
        key,
        {
          ring: d.missing ? "red" : d.taken ? "green" : null,
          fill: d.taken ? (d.mismatch ? "orange" : "green") : null,
        },
      ]),
  );
}

/**
 * En enskild lektion med elevlista och redan satt närvaro, för den som kommer
 * från översikten eller lektionslistan och redan vet vilken lektion det är.
 *
 * @auth Admin eller lektionens lärare
 */
export async function getLessonAttendance(
  lessonId: string,
): Promise<AttendanceLesson | null> {
  const session = await requireTeacherOrAdmin();
  if (!session) return null;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: lessonSelect,
  });
  if (!lesson || !mayTakeAttendance(session, lesson)) return null;

  return (await toAttendanceLessons([lesson]))[0] ?? null;
}

/**
 * Sparar närvaron för en lektion.
 *
 * Rör varken bokningar eller klipp. Att markera någon som närvarande är ett
 * konstaterande, inte ett köp — därför kan även en elev som lagts till i
 * kursen för hand bockas i, trots att hen inte har någon bokning.
 *
 * Listan sparar varje kryss direkt, en elev i taget (eller alla vid "Alla
 * närvarande"). "Klar" markerar de omarkerade som frånvarande med
 * onlyIfUnmarked: tar två lärare närvaro samtidigt skriver den ena då inte
 * över den andras "närvarande" bara för att eleven var omarkerad hos hen.
 *
 * @auth Admin, lektionens lärare eller kursens lärare
 */
export async function saveAttendance(
  lessonId: string,
  marks: AttendanceMark[],
): Promise<Result> {
  const session = await requireTeacherOrAdmin();
  if (!session) return { success: false, msg: "Ingen behörighet." };

  const parsedId = idSchema.safeParse(lessonId);
  const parsedMarks = marksSchema.safeParse(marks);
  if (!parsedId.success || !parsedMarks.success) {
    return { success: false, msg: "Ogiltig närvaro." };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsedId.data },
    select: lessonSelect,
  });
  if (!lesson) return { success: false, msg: "Lektionen hittades inte." };
  if (!mayTakeAttendance(session, lesson)) {
    return { success: false, msg: "Det här är inte din lektion." };
  }
  if (lesson.cancelled) {
    return { success: false, msg: "Lektionen är inställd." };
  }

  // Bara elever som står på lektionens lista får markeras, så en manipulerad
  // nyckel inte kan skapa närvaro för vem som helst.
  const allowed = new Map(
    ((await lessonStudents([lesson])).get(lesson.id) ?? []).map((s) => [
      s.studentKey,
      s,
    ]),
  );
  const valid = parsedMarks.data.filter((mark) => allowed.has(mark.studentKey));
  if (valid.length === 0) {
    return { success: false, msg: "Inga elever att spara närvaro för." };
  }

  const row = (mark: (typeof valid)[number]) => {
    const student = allowed.get(mark.studentKey);
    return {
      lessonId: lesson.id,
      studentKey: mark.studentKey,
      userId: student?.userId ?? null,
      participantId: student?.participantId ?? null,
      status: (mark.present ? "PRESENT" : "ABSENT") as AttendanceStatus,
      markedByUserId: session.user.id,
    };
  };
  const explicit = valid.filter((mark) => !mark.onlyIfUnmarked).map(row);
  const defaults = valid.filter((mark) => mark.onlyIfUnmarked).map(row);

  await prisma.$transaction([
    ...explicit.map((data) =>
      prisma.attendance.upsert({
        where: {
          lessonId_studentKey: {
            lessonId: data.lessonId,
            studentKey: data.studentKey,
          },
        },
        update: { status: data.status, markedByUserId: data.markedByUserId },
        create: data,
      }),
    ),
    // Finns redan en markering vinner den.
    ...(defaults.length > 0
      ? [prisma.attendance.createMany({ data: defaults, skipDuplicates: true })]
      : []),
  ]);

  revalidatePath("/admin/attendance");
  revalidatePath("/user");

  // Räknas på det som nu står i registret, inte på det som skickades — det
  // är bara ändringarna.
  const saved = await prisma.attendance.groupBy({
    by: ["status"],
    where: { lessonId: lesson.id },
    _count: true,
  });
  const countOf = (status: AttendanceStatus) =>
    saved.find((g) => g.status === status)?._count ?? 0;
  const present = countOf("PRESENT");
  return {
    success: true,
    msg: `Närvaron är sparad: ${present} av ${present + countOf("ABSENT")} närvarande.`,
  };
}

/** En elev som var närvarande men inte har någon bokning på lektionen. */
export type PresentWithoutBooking = {
  studentKey: string;
  name: string;
  /**
   * Kursraden att boka på: elevens köp i kursen med saldo kvar. Null när
   * köp saknas — eleven är då tillagd för hand — eller saldot är slut.
   */
  purchaseItemId: string | null;
  /** Köpets ägare, som bokningen görs på. */
  ownerUserId: string | null;
  reason: "bookable" | "noPurchase" | "noBalance";
};

export type BookingAttendance = {
  /** Någon på lektionen har markerats, alltså är närvaron tagen. */
  taken: boolean;
  byStudentKey: Record<string, AttendanceStatus>;
  /** Närvarande utan bokning: gick utan att ha bokat, eller saknar köp. */
  presentWithoutBooking: PresentWithoutBooking[];
};

/**
 * Närvaron på en lektion per elev, för bokningsdialogen.
 *
 * Bokningarna och närvaron hålls isär. Dialogen visar bara bredvid varje
 * bokning om eleven markerats, så att studion ser vilka bokningar som saknar
 * närvaro — och omvänt vilka som var där utan att ha bokat, så att de kan
 * bokas in i efterhand.
 *
 * @auth Admin eller lektionens lärare
 */
export async function getBookingAttendance(
  lessonId: string,
): Promise<BookingAttendance> {
  const empty = { taken: false, byStudentKey: {}, presentWithoutBooking: [] };
  const session = await requireTeacherOrAdmin();
  if (!session) return empty;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      courseId: true,
      teacherId: true,
      course: { select: { teacherId: true } },
    },
  });
  if (!lesson || !mayTakeAttendance(session, lesson)) return empty;

  const [marks, bookings] = await Promise.all([
    prisma.attendance.findMany({
      where: { lessonId },
      select: {
        studentKey: true,
        status: true,
        userId: true,
        participantId: true,
        user: { select: { name: true } },
        participant: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: { lessonId, cancelled: false },
      select: {
        purchaseItem: {
          select: {
            purchase: { select: { userId: true, participantId: true } },
          },
        },
      },
    }),
  ]);

  const booked = new Set(
    bookings.map((b) => studentKeyOf(b.purchaseItem.purchase)),
  );
  const unbooked = marks.filter(
    (m) => m.status === "PRESENT" && !booked.has(m.studentKey),
  );

  // Elevernas köp i kursen, för att kunna boka in dem direkt.
  const items = unbooked.length
    ? await prisma.purchaseItem.findMany({
        where: {
          courseId: lesson.courseId,
          OR: unbooked.map((m) =>
            m.participantId
              ? { purchase: { participantId: m.participantId } }
              : { purchase: { userId: m.userId ?? "", participantId: null } },
          ),
        },
        select: {
          id: true,
          unlimited: true,
          remainingCount: true,
          purchase: {
            select: {
              userId: true,
              participantId: true,
              type: true,
              remainingCount: true,
            },
          },
        },
      })
    : [];

  const presentWithoutBooking = unbooked.map((m): PresentWithoutBooking => {
    const own = items.filter((i) => studentKeyOf(i.purchase) === m.studentKey);
    const withBalance = own.find((i) =>
      hasRemainingCount(
        calcRemainingCount({ purchase: i.purchase, purchaseItem: i }),
      ),
    );
    return {
      studentKey: m.studentKey,
      name: m.participant?.name ?? m.user?.name ?? "Okänd",
      purchaseItemId: withBalance?.id ?? null,
      ownerUserId: withBalance?.purchase.userId ?? null,
      reason: withBalance
        ? "bookable"
        : own.length
          ? "noBalance"
          : "noPurchase",
    };
  });

  return {
    taken: marks.length > 0,
    byStudentKey: Object.fromEntries(
      marks.map((m) => [m.studentKey, m.status]),
    ),
    presentWithoutBooking,
  };
}

export type LessonBookings = {
  courseName: string;
  studentsAndPurchases: StudentWithPurchaseItemsWithCourse[];
  bookings: BookingWithUserAndParticipant[];
  attendance: BookingAttendance;
};

/**
 * Allt bokningsdialogen visar, hämtat när den öppnas.
 *
 * Dialogen står på varje lektion i karusellen, uppföljningen och listorna.
 * Hämtades datan när sidan renderades kostade det fyra frågor per lektion,
 * också för de dialoger som aldrig öppnades.
 *
 * Varje del kontrollerar dessutom behörigheten själv, som tidigare.
 *
 * @auth Admin, lektionens lärare eller kursens lärare
 */
export async function getLessonBookings(
  lessonId: string,
): Promise<LessonBookings | null> {
  const session = await requireTeacherOrAdmin();
  if (!session) return null;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      courseId: true,
      teacherId: true,
      course: { select: lessonSelect.course.select },
    },
  });
  if (!lesson || !mayTakeAttendance(session, lesson)) return null;

  const [studentsAndPurchases, bookings, attendance] = await Promise.all([
    getUsersWithPurchasedProductsWithCourseInIt(lesson.courseId),
    getBookings(lessonId),
    getBookingAttendance(lessonId),
  ]);

  return {
    courseName: getCourseName(lesson.course),
    studentsAndPurchases,
    bookings,
    attendance,
  };
}

export type MyAttendance = {
  id: string;
  lessonId: string;
  startTime: Date;
  endTime: Date;
  courseName: { sv: string; en: string };
  /** Null när det är kunden själv. */
  participantName: string | null;
  status: AttendanceStatus;
};

const myAttendanceSelect = {
  id: true,
  status: true,
  participant: { select: { name: true, userId: true } },
  lesson: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      course: {
        select: {
          name: true,
          name_en: true,
          minAge: true,
          maxAge: true,
          adult: true,
          level: true,
          level_en: true,
        },
      },
    },
  },
} satisfies Prisma.AttendanceSelect;

/**
 * Kundens och deltagarnas närvaro. Inställda lektioner räknas inte: en
 * markering som gjorts innan lektionen ställdes in säger ingenting.
 */
function myAttendanceWhere(userId: string): Prisma.AttendanceWhereInput {
  return {
    lesson: { cancelled: false },
    OR: [
      { userId },
      { participant: { userId } },
      { participant: { addedByUserId: userId } },
    ],
  };
}

function toMyAttendance(
  m: Prisma.AttendanceGetPayload<{ select: typeof myAttendanceSelect }>,
  userId: string,
): MyAttendance {
  return {
    id: m.id,
    lessonId: m.lesson.id,
    startTime: m.lesson.startTime,
    endTime: m.lesson.endTime,
    courseName: {
      sv: getCourseName(m.lesson.course, "sv"),
      en: getCourseName(m.lesson.course, "en"),
    },
    participantName:
      m.participant && m.participant.userId !== userId
        ? m.participant.name
        : null,
    status: m.status,
  };
}

/**
 * Kundens egen närvaro och deltagarnas, för profilsidan: de senaste raderna
 * plus summan över allt. Summan räknas i databasen, så den stämmer även när
 * listan bara visar en del.
 *
 * Hämtas ur närvaroregistret och inte via bokningarna: en elev kan vara
 * markerad utan bokning, och en bokning utan markering betyder bara att
 * läraren inte tagit närvaro — det är inte samma sak som frånvaro.
 */
export async function getMyAttendance(): Promise<{
  items: MyAttendance[];
  total: number;
  present: number;
}> {
  const session = await getSessionData();
  if (!session) return { items: [], total: 0, present: 0 };

  const userId = session.user.id;
  const where = myAttendanceWhere(userId);

  const [marks, total, present] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { lesson: { startTime: "desc" } },
      take: MY_ATTENDANCE_PAGE,
      select: myAttendanceSelect,
    }),
    prisma.attendance.count({ where }),
    prisma.attendance.count({ where: { ...where, status: "PRESENT" } }),
  ]);

  return { items: marks.map((m) => toMyAttendance(m, userId)), total, present };
}

/** "Visa fler": nästa sida efter de `skip` rader som redan visas. */
export async function loadMoreAttendance(
  skip: number,
): Promise<MyAttendance[]> {
  const session = await getSessionData();
  if (!session) return [];

  const userId = session.user.id;
  const marks = await prisma.attendance.findMany({
    where: myAttendanceWhere(userId),
    orderBy: { lesson: { startTime: "desc" } },
    skip: Math.max(0, Math.floor(skip)),
    take: MY_ATTENDANCE_PAGE,
    select: myAttendanceSelect,
  });
  return marks.map((m) => toMyAttendance(m, userId));
}

/**
 * Närvaro för kalendern, en månad i taget. Egen fråga så kalendern inte
 * beror på listans sidindelning. `fromStr`/`toStr` är YYYY-MM-DD (Stockholm).
 */
export async function getMyAttendanceInRange(
  fromStr: string,
  toStr: string,
): Promise<MyAttendance[]> {
  const session = await getSessionData();
  if (!session) return [];

  if (!dateRangeSchema.safeParse({ from: fromStr, to: toStr }).success)
    return [];

  const userId = session.user.id;
  const marks = await prisma.attendance.findMany({
    where: {
      AND: [
        myAttendanceWhere(userId),
        {
          lesson: {
            startTime: {
              gte: parseStockholmDateInput(fromStr),
              lte: endOfStockholmDateInput(toStr),
            },
          },
        },
      ],
    },
    orderBy: { lesson: { startTime: "asc" } },
    select: myAttendanceSelect,
  });
  return marks.map((m) => toMyAttendance(m, userId));
}
