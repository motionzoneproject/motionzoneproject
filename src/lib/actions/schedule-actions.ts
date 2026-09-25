"use server";

import { revalidatePath } from "next/cache";
import { handleClips } from "@/lib/clips";
import prisma from "../prisma";
import { isAdminRole } from "./admin";
import { calcRemainingCount, showRemaining } from "./purchase-helpers";
import { autobook } from "./server-actions";
import { getSessionData } from "./sessiondata";

type Result = { success: boolean; msg: string };

/**
 * En kurs i ett köp, sedd som "går eleven den här kursen eller inte".
 *
 * Kursraderna i ett köp (PurchaseItem) säger bara vad kunden har rätt att gå
 * på. För ett terminskort eller ett program är det tjugotal kurser, varav
 * eleven går ett fåtal. Vilka det är avgörs av bokningarna, och det är dem
 * den här vyn sätter.
 */
export type ScheduleRow = {
  purchaseItemId: string;
  courseId: string;
  courseName: string;
  /** Kommande lektioner i kursen som inte är inställda. */
  upcomingLessons: number;
  /** Hur många av dem eleven redan är bokad på. */
  bookedUpcoming: number;
  /** Bokningar totalt, inklusive lektioner som redan varit. */
  bookedTotal: number;
  /** Saldo kvar att boka med. "∞" för obegränsade rader. */
  remaining: string;
  /** Sant när saldot är slut och inget mer går att boka. */
  outOfBalance: boolean;
};

export type PurchaseSchedule = {
  purchaseId: string;
  studentName: string;
  productName: string;
  /** Sant för produkter där schemat sätts ihop manuellt (kort och program). */
  manualSchedule: boolean;
  /**
   * Sant för klippkort, där alla kurser delar på samma pott. Att boka in på
   * en hel kurs kan då förbruka hela kortet på den ena kursen.
   */
  sharedBalance: boolean;
  /** Klippkortets saldo, när potten är gemensam. */
  balance: string | null;
  rows: ScheduleRow[];
};

async function mayManageCourse(courseId: string): Promise<boolean> {
  const session = await getSessionData();
  if (!session) return false;
  if (session.user.role === "admin") return true;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });

  return course?.teacherId === session.user.id;
}

/**
 * Hämtar ett köps kurser med bokningsläge, för schemadialogen.
 *
 * @auth Admin
 */
export async function getPurchaseSchedule(
  purchaseId: string,
): Promise<PurchaseSchedule | null> {
  if (!(await isAdminRole())) return null;

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      id: true,
      type: true,
      remainingCount: true,
      user: { select: { name: true } },
      participant: { select: { name: true } },
      product: { select: { name: true, autobook: true, maxCourses: true } },
      PurchaseItems: {
        select: {
          id: true,
          courseId: true,
          remainingCount: true,
          unlimited: true,
          course: { select: { name: true } },
        },
      },
    },
  });

  if (!purchase) return null;

  const now = new Date();

  const rows: ScheduleRow[] = await Promise.all(
    purchase.PurchaseItems.map(async (item) => {
      const [upcomingLessons, bookedUpcoming, bookedTotal] = await Promise.all([
        prisma.lesson.count({
          where: {
            courseId: item.courseId,
            cancelled: false,
            startTime: { gte: now },
          },
        }),
        prisma.booking.count({
          where: {
            purchaseItemId: item.id,
            lesson: { startTime: { gte: now } },
          },
        }),
        prisma.booking.count({ where: { purchaseItemId: item.id } }),
      ]);

      const remaining = calcRemainingCount({
        purchase: {
          type: purchase.type,
          remainingCount: purchase.remainingCount,
        },
        purchaseItem: {
          unlimited: item.unlimited,
          remainingCount: item.remainingCount,
        },
      });

      return {
        purchaseItemId: item.id,
        courseId: item.courseId,
        courseName: item.course.name,
        upcomingLessons,
        bookedUpcoming,
        bookedTotal,
        remaining: String(showRemaining(remaining)),
        outOfBalance: remaining !== Number.POSITIVE_INFINITY && remaining <= 0,
      };
    }),
  );

  rows.sort((a, b) => a.courseName.localeCompare(b.courseName, "sv"));

  const isClip = purchase.type === "CLIP";

  return {
    purchaseId: purchase.id,
    studentName: purchase.participant?.name ?? purchase.user.name,
    productName: purchase.product.name,
    manualSchedule: !purchase.product.autobook,
    sharedBalance: isClip && purchase.PurchaseItems.length > 1,
    balance: isClip ? String(purchase.remainingCount ?? 0) : null,
    rows,
  };
}

/** Varför en kund inte kunde boka in sig, så klienten kan översätta. */
export type BookMyCourseResult =
  | { success: true; count: number }
  | {
      success: false;
      reason: "unauthorized" | "notSelected" | "nothingToBook" | "error";
    };

/**
 * Kunden bokar in sig själv, eller sin deltagare, på en hel kurs.
 *
 * Samma sak som schemadialogen gör åt admin, fast för kundens eget köp. Ett
 * terminskort eller program bokar inte in någon av sig själv — utan det här
 * var kundens enda väg att boka en lektion i taget i kalendern, och knappen
 * på kursraden sa bara "inga nya lektioner" utan att göra något.
 *
 * autobook() anropas uttryckligen, eftersom kunden pekat ut kursen. Men det
 * släpper också spärren för paketens kursval, så den kontrolleras här: i ett
 * paket där kunden valt kurser går bara de valda att boka.
 *
 * @auth Köpets ägare
 */
export async function bookMyCourse(
  purchaseItemId: string,
): Promise<BookMyCourseResult> {
  const session = await getSessionData();
  if (!session) return { success: false, reason: "unauthorized" };

  const item = await prisma.purchaseItem.findUnique({
    where: { id: purchaseItemId },
    select: {
      courseId: true,
      purchase: { select: { userId: true } },
      orderItem: {
        select: { courseSelections: { select: { courseId: true } } },
      },
    },
  });

  if (!item || item.purchase.userId !== session.user.id) {
    return { success: false, reason: "unauthorized" };
  }

  const selected = item.orderItem.courseSelections.map((s) => s.courseId);
  if (selected.length > 0 && !selected.includes(item.courseId)) {
    return { success: false, reason: "notSelected" };
  }

  try {
    const created = await autobook(purchaseItemId, undefined, {
      explicit: true,
    });

    if (created.length === 0)
      return { success: false, reason: "nothingToBook" };

    revalidatePath("/user");
    revalidatePath("/admin/students");
    revalidatePath("/admin/lectures");

    return { success: true, count: created.length };
  } catch (e) {
    console.error("bookMyCourse misslyckades", e);
    return { success: false, reason: "error" };
  }
}

/**
 * Bokar in eller ut en elev på en hel kurs.
 *
 * Det här är verktyget för kort och program, där köpet ger tillgång till
 * många kurser men eleven bara går några av dem. Bokar in gör samma sak som
 * ett ordergodkännande hade gjort, fast för en kurs i taget och på adminens
 * uttryckliga begäran. Bokar ut rör bara kommande lektioner — närvaro som
 * redan varit ska stå kvar.
 *
 * @auth Admin, eller kursens egen lärare
 */
export async function setCourseBooking(
  purchaseItemId: string,
  booked: boolean,
): Promise<Result> {
  const purchaseItem = await prisma.purchaseItem.findUnique({
    where: { id: purchaseItemId },
    select: { id: true, courseId: true, course: { select: { name: true } } },
  });

  if (!purchaseItem) return { success: false, msg: "Kursraden hittades inte." };

  if (!(await mayManageCourse(purchaseItem.courseId))) {
    return { success: false, msg: "Ingen behörighet." };
  }

  try {
    if (booked) {
      const created = await autobook(purchaseItemId, undefined, {
        explicit: true,
      });

      if (created.length === 0) {
        return {
          success: false,
          msg: `Inget att boka i ${purchaseItem.course.name}. Kursen kan sakna kommande lektioner, eller så är saldot slut.`,
        };
      }

      revalidatePath("/admin/students");
      revalidatePath("/admin/lectures");
      revalidatePath("/user");

      return {
        success: true,
        msg: `Inbokad på ${created.length} lektioner i ${purchaseItem.course.name}.`,
      };
    }

    // Bokar ut: bara kommande lektioner, och klippen tillbaka.
    const now = new Date();
    const futureBookings = await prisma.booking.findMany({
      where: {
        purchaseItemId,
        lesson: { startTime: { gte: now } },
      },
      select: { id: true },
    });

    if (futureBookings.length === 0) {
      return {
        success: false,
        msg: `Eleven har inga kommande bokningar i ${purchaseItem.course.name}.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      const clipResult = await handleClips(
        tx,
        purchaseItemId,
        futureBookings.length,
      );
      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Kunde inte återställa saldo.");
      }

      await tx.booking.deleteMany({
        where: { id: { in: futureBookings.map((b) => b.id) } },
      });
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin/lectures");
    revalidatePath("/user");

    return {
      success: true,
      msg: `Utbokad från ${futureBookings.length} kommande lektioner i ${purchaseItem.course.name}.`,
    };
  } catch (e) {
    console.error("setCourseBooking misslyckades", e);
    return { success: false, msg: "Kunde inte ändra bokningarna." };
  }
}
