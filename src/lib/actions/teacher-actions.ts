"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { adminTeacherSchema } from "@/validations/adminforms";
import { sanitizeRichText } from "../dom-sanitize";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

/**
 * Check if session user is admin.
 */
async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();
  return sessiondata?.user.role === "admin";
}

/**
 * Check if session user is admin or teacher.
 */
async function isAdminOrTeacherRole(): Promise<boolean> {
  const sessiondata = await getSessionData();
  const role = sessiondata?.user.role;
  return role === "admin" || role === "teacher";
}

export type TeacherWithProfile = Prisma.UserGetPayload<{
  include: { teacherProfile: true };
}>;

export type PublicTeacher = {
  id: string;
  name: string;
  teacherProfile: Prisma.TeacherProfileGetPayload<true> | null;
};

/**
 * Lärarprofiler för den publika presentationssidan. Medvetet oskyddad, så
 * den får bara selecta fält som är okej för vem som helst att se — aldrig
 * e-post, roll eller ban-status.
 * @auth Public
 */
export async function getPublicTeachers(): Promise<PublicTeacher[]> {
  return prisma.user.findMany({
    where: { teacherProfile: { isNot: null } },
    select: { id: true, name: true, teacherProfile: true },
  });
}

/**
 * Samma lista men med hela User-raden, för adminvyn.
 * @auth Admin eller lärare.
 */
export async function getTeachers(): Promise<TeacherWithProfile[]> {
  if (!(await isAdminOrTeacherRole())) return [];

  return prisma.user.findMany({
    where: { teacherProfile: { isNot: null } },
    include: { teacherProfile: true },
  });
}

/**
 * Användare som kan kopplas till en lärarprofil. Returnerar hela User-rader
 * (e-post, roll, ban-status) och måste därför vara låst.
 * @auth Admin eller lärare.
 */
export async function getTeacherUsers(): Promise<TeacherWithProfile[]> {
  if (!(await isAdminOrTeacherRole())) return [];

  return prisma.user.findMany({
    where: { role: { in: ["admin", "teacher"] } },
    include: { teacherProfile: true },
  });
}

/**
 * Create a new teacher profile.
 * @auth Admin, or a teacher creating their own (first-time) profile.
 */
export async function createTeacher(
  formData: z.infer<typeof adminTeacherSchema>,
) {
  const sessiondata = await getSessionData();
  const role = sessiondata?.user.role;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  if (!isAdmin && !isTeacher) {
    return { success: false, msg: "No permission." };
  }

  try {
    const validated = await adminTeacherSchema.parseAsync(formData);

    // En lärare får bara skapa sin egen profil, aldrig åt någon annan.
    if (isTeacher && validated.userId !== sessiondata?.user.id) {
      return { success: false, msg: "No permission." };
    }

    await prisma.teacherProfile.create({
      data: {
        userId: validated.userId,
        name: validated.name,
        specialty: validated.specialty ?? "",
        description: await sanitizeRichText(validated.description),
        specialty_en: validated.specialty_en ?? "",
        description_en: await sanitizeRichText(validated.description_en),
        imageUrl: validated.imageUrl,
        active: validated.active ?? true,
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/admin/teachers");
    revalidatePath("/user");
    revalidatePath("/about"); // Revalidate public page too

    return { success: true, msg: "Lärare skapad." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa lärare." };
  }
}

/**
 * Update a teacher profile.
 * @auth Admin, or the teacher who owns this profile.
 */
export async function updateTeacher(
  id: string,
  formData: z.infer<typeof adminTeacherSchema>,
) {
  const sessiondata = await getSessionData();
  const role = sessiondata?.user.role;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  if (!isAdmin && !isTeacher) {
    return { success: false, msg: "No permission." };
  }

  try {
    const validated = await adminTeacherSchema.parseAsync(formData);

    if (isTeacher) {
      const existing = await prisma.teacherProfile.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!existing || existing.userId !== sessiondata?.user.id) {
        return { success: false, msg: "Ingen behörighet för denna profil." };
      }
      // En lärare kan inte flytta sin profil till en annan användare.
      if (validated.userId !== sessiondata?.user.id) {
        return { success: false, msg: "No permission." };
      }
    }

    await prisma.teacherProfile.update({
      where: { id },
      data: {
        userId: validated.userId,
        name: validated.name,
        specialty: validated.specialty ?? "",
        description: await sanitizeRichText(validated.description),
        specialty_en: validated.specialty_en ?? "",
        description_en: await sanitizeRichText(validated.description_en),
        imageUrl: validated.imageUrl,
        active: validated.active ?? true,
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/admin/teachers");
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
    revalidatePath("/admin/teachers");
    revalidatePath("/about");

    return { success: true, msg: "Lärare borttagen." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort lärare." };
  }
}
