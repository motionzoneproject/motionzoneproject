"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Course } from "@/generated/prisma/client";
import { adminAddCourseSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { isAdminRole } from "./admin-shared";
import { handleClips } from "./purchase-actions";

/**
 * Listing courses, with filter for course name. (Notice that its not searching for the combined name only the db field name)
 * @param q term for course name.
 * @returns the found courses as Course[]
 * @auth Admin
 */
export async function getAllCourses(
  q: string = "",
  showInactive = false,
): Promise<Course[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const courses = await prisma.course.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      ...(showInactive ? {} : { active: true }),
    },
    orderBy: { name: "asc" },
  });
  return courses;
}

/**
 * Removes a course, all schemaItems, lessons and bookings and restores clips.
 * * @important
 * @returns Success (boolean) and a message.
 * * @auth Admin
 */
export async function delCourse(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hitta aktiva bokningar för denna kurs (för att återställa =))
    const bookings = await prisma.booking.findMany({
      where: {
        lesson: { courseId: id },
        cancelled: false,
      },
      select: { purchaseItemId: true },
    });

    // Kör transaktionen
    const result = await prisma.$transaction(async (tx) => {
      // Återställ klipp för de bokningar som kommer raderas via cascade
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          // Via handleclips:
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      // 3. Försök radera kursen (om den finns i produkt så kommer inte transaktionen gå igenom.)
      const deletedCourse = await tx.course.delete({
        where: { id },
        select: { name: true },
      });

      return deletedCourse.name;
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Kursen ${result} raderades. ${bookings.length} bokningar togs bort och klipp återställdes.`,
    };
  } catch (e) {
    console.error(e);

    return {
      success: false,
      msg: "Kunde inte radera kursen.",
    };
  }
}

/**
 * Creates a new course
 * * @returns Ett objekt med success-status och ett bekräftande meddelande med kursens namn.
 * @auth Admin
 */
export async function addNewCourse(
  formData: z.output<typeof adminAddCourseSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseSchema.parseAsync(formData);

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    const newCourseItem = await prisma.course.create({
      data: {
        name: validated.name,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        level: validated.level,
        adult: validated.adult,
        description: validated.description,
        teacherId: validated.teacherid,
      },
    });
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} skapades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa kursen." };
  }
}

/**
 * Updates the information on a existing course.
 * @returns Success (boolean) and a message.
 * @auth Admin
 */
export async function editCourse(
  id: string,
  formData: z.output<typeof adminAddCourseSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseSchema.parseAsync(formData);

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    const newCourseItem = await prisma.$transaction(async (tx) => {
      const updatedCourse = await tx.course.update({
        data: {
          name: validated.name,
          minAge: validated.minAge,
          maxAge: validated.maxAge,
          level: validated.level,
          adult: validated.adult,
          description: validated.description,
          teacherId: validated.teacherid,
        },
        where: { id },
      });

      await tx.lesson.updateMany({
        where: { courseId: id },
        data: { teacherId: validated.teacherid },
      });

      return updatedCourse;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/courses");
    revalidatePath("/admin/lectures");
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} ändrades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kursen." };
  }
}

export async function toggleCourseActive(
  id: string,
  active: boolean,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const course = await prisma.course.update({
      where: { id },
      data: { active },
    });
    revalidatePath("/admin/courses");
    return {
      success: true,
      msg: `Kursen "${course.name}" är nu ${active ? "aktiv" : "inaktiv"}.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kursen." };
  }
}
