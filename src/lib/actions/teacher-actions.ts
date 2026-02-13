"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import { adminTeacherSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

/**
 * Check if session user is admin.
 */
async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();
  return sessiondata?.user.role === "admin";
}

export type TeacherProfileType = z.infer<typeof adminTeacherSchema> & {
  id: string;
};

/**
 * Get all teacher profiles.
 * Accessible by public (for now, or maybe restriction needed? Usually public).
 */
export async function getTeachers() {
  const teachers = await prisma.teacherProfile.findMany({
    orderBy: { displayOrder: "asc" },
  });
  return teachers;
}

/**
 * Create a new teacher profile.
 * @auth Admin
 */
export async function createTeacher(
  formData: z.infer<typeof adminTeacherSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminTeacherSchema.parseAsync(formData);

    await prisma.teacherProfile.create({
      data: {
        name: validated.name,
        specialty: validated.specialty ?? "",
        description: validated.description ?? "",
        imageUrl: validated.imageUrl,
        active: validated.active ?? true,
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about"); // Revalidate public page too

    return { success: true, msg: "Lärare skapad." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa lärare." };
  }
}

/**
 * Update a teacher profile.
 * @auth Admin
 */
export async function updateTeacher(
  id: string,
  formData: z.infer<typeof adminTeacherSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminTeacherSchema.parseAsync(formData);

    await prisma.teacherProfile.update({
      where: { id },
      data: {
        name: validated.name,
        specialty: validated.specialty ?? "",
        description: validated.description ?? "",
        imageUrl: validated.imageUrl,
        active: validated.active ?? true,
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Lärare uppdaterad." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera lärare." };
  }
}

/**
 * Delete a teacher profile.
 * @auth Admin
 */
export async function deleteTeacher(id: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    await prisma.teacherProfile.delete({
      where: { id },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Lärare borttagen." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort lärare." };
  }
}
