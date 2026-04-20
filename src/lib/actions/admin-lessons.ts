"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Lesson } from "@/generated/prisma/client";
import {
  adminBulkCancelLessonsSchema,
  adminLessonFormSchema,
} from "@/validations/adminforms";
import { generateBookingCancelledHtml, sendMail } from "../mail";
import prisma from "../prisma";
import { isAdminRole } from "./admin-shared";
import { handleClips } from "./purchase-actions";

export type MailStudentRecipient = {
  name: string;
  email: string;
};

export async function sendCancelledMail(
  lesson: Lesson & { course?: { name: string } | null },
  students: MailStudentRecipient[],
): Promise<{
  success: boolean;
  msg: string;
  results: { email: string; name: string; success: boolean }[];
}> {
  const uniqueStudents = Array.from(
    new Map(
      students
        .filter((student) => student.email)
        .map((student) => [student.email.toLowerCase(), student]),
    ).values(),
  );

  const BATCH_SIZE = 10;
  const results: { email: string; name: string; success: boolean }[] = [];

  for (let i = 0; i < uniqueStudents.length; i += BATCH_SIZE) {
    const batch = uniqueStudents.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (student) => {
        const html = await generateBookingCancelledHtml(lesson, student);
        const subject = `Inställd lektion${
          lesson.course?.name ? ` - ${lesson.course.name}` : ""
        }`;
        const text = `Hej ${student.name}, din bokade lektion${
          lesson.course?.name ? ` i ${lesson.course.name}` : ""
        } den ${new Date(lesson.startTime).toLocaleDateString("sv-SE")} kl ${new Date(
          lesson.startTime,
        ).toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        })} har blivit inställd. Ditt tillfälle har återställts.`;
        const result = await sendMail(student.email, subject, html, text);

        return {
          email: student.email,
          name: student.name,
          success: result.success,
        };
      }),
    );
    results.push(...batchResults);
  }

  const sentCount = results.filter((result) => result.success).length;
  const failed = results.filter((result) => !result.success);

  return {
    success: failed.length === 0,
    msg:
      results.length === 0
        ? "Inga mottagare att skicka till."
        : failed.length === 0
          ? `Skickade ${sentCount} mail.`
          : `Skickade ${sentCount} mail, men ${failed.length} misslyckades.`,
    results,
  };
}

/**
 * Edit a lessonItem and handle clips.
 * @returns Success (boolean) and a message.
 * @auth Admin
 */
export async function editLessonItem(
  formData: z.output<typeof adminLessonFormSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminLessonFormSchema.parseAsync(formData);

    const currentLesson = await prisma.lesson.findUnique({
      where: { id: validated.id },
      include: { bookings: true, course: { select: { name: true } } },
    });

    if (!currentLesson) return { success: false, msg: "Lesson not found." };

    let mailStudents: MailStudentRecipient[] = [];

    await prisma.$transaction(async (tx) => {
      if (!currentLesson.cancelled && validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }

        // Hämta emails.
        const bookingsToMail = await tx.booking.findMany({
          where: { lessonId: validated.id },
          select: {
            purchaseItem: {
              select: {
                purchase: {
                  select: {
                    participant: { include: { addedBy: true } },
                    user: true,
                  },
                },
              },
            },
          },
        });

        mailStudents = bookingsToMail.map((b) => ({
          name:
            b.purchaseItem.purchase.participant?.name ||
            b.purchaseItem.purchase.user.name,
          email:
            b.purchaseItem.purchase.participant?.email ||
            b.purchaseItem.purchase.participant?.addedBy.email ||
            b.purchaseItem.purchase.user.email,
        }));

        // Ta bort bokningarna när lektionen ställs in.
        await tx.booking.deleteMany({
          where: { lessonId: validated.id },
        });
      }

      // 4. Uppdatera själva lektionen
      await tx.lesson.update({
        where: { id: validated.id },
        data: {
          message: validated.message,
          cancelled: validated.cancelled,
        },
      });
    });

    let mailMsg = "Ingen info.";

    if (!currentLesson.cancelled && validated.cancelled) {
      const mailResult = await sendCancelledMail(
        {
          ...currentLesson,
          message: validated.message ?? null,
          cancelled: validated.cancelled,
        },
        mailStudents,
      );

      mailMsg = mailResult.msg;

      if (!mailResult.success) {
        mailMsg = ` ${mailResult.msg}`;
      }
    }

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");

    return {
      success: true,
      msg: `Lektionen, bokningar och klipp-saldon har uppdaterats. ${mailMsg}`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
  }
}

/**
 * Bulk update lessons to cancelled state in a date range and selected courses.
 * Restores clips and removes existing bookings for newly cancelled lessons.
 * @auth Admin
 */
export async function bulkCancelLessons(
  formData: z.output<typeof adminBulkCancelLessonsSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminBulkCancelLessonsSchema.parseAsync(formData);
    const from = new Date(validated.from);
    from.setHours(0, 0, 0, 0);

    const to = new Date(validated.to);
    to.setHours(23, 59, 59, 999);

    const lessons = await prisma.lesson.findMany({
      where: {
        startTime: {
          gte: from,
          lte: to,
        },
        courseId: {
          in: validated.courseIds,
        },
      },
      select: {
        id: true,
        cancelled: true,
      },
    });

    if (lessons.length === 0) {
      return {
        success: false,
        msg: "Inga lektioner matchade ditt urval.",
      };
    }

    const lessonIds = lessons.map((lesson) => lesson.id);
    const newlyCancelledLessonIds = lessons
      .filter((lesson) => !lesson.cancelled)
      .map((lesson) => lesson.id);

    await prisma.$transaction(async (tx) => {
      if (newlyCancelledLessonIds.length > 0) {
        const bookings = await tx.booking.findMany({
          where: {
            lessonId: { in: newlyCancelledLessonIds },
          },
          select: {
            id: true,
            purchaseItemId: true,
          },
        });

        for (const booking of bookings) {
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }

        await tx.booking.deleteMany({
          where: {
            lessonId: { in: newlyCancelledLessonIds },
          },
        });
      }

      await tx.lesson.updateMany({
        where: {
          id: { in: lessonIds },
        },
        data: {
          cancelled: validated.cancelled,
          message: validated.message,
        },
      });
    });

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");

    return {
      success: true,
      msg: `${lessonIds.length} lektioner markerades som installda.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
  }
}
