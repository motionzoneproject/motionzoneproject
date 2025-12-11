"use server";

import type z from "zod";
import type {
  Course,
  SchemaItem,
  Termin,
  Weekday,
} from "@/generated/prisma/client";
import { adminAddCourseToSchemaSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { formToDbDate } from "../time-convert";
import { getSessionData } from "./sessiondata";

// Lika bra att exportera denna tänker jag.
export async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();

  return sessiondata?.user.role === "admin";
}

// Inser att det är svengelska. Men men.
export async function getTermin(): Promise<Termin[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  // Behövs mer säkerhet än såhär?

  const terminer = await prisma.termin.findMany();
  return terminer;
}

export type SchemaItemWithCourse = SchemaItem & { course: Course };

export async function getSchemaItems(
  terminId: string,
): Promise<SchemaItemWithCourse[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const schemaItems = await prisma.schemaItem.findMany({
    where: { terminId },
    include: { course: true },
  });
  return schemaItems;
}

export async function getAllCourses(): Promise<Course[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const courses = await prisma.course.findMany();
  return courses;
}

export async function addCoursetoSchema(
  terminId: string,
  formData: z.infer<typeof adminAddCourseToSchemaSchema>,
): Promise<{
  success: boolean;
  msg: string;
}> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  // try {
  const validated = await adminAddCourseToSchemaSchema.parseAsync(formData);

  const newSchemaItem = await prisma.schemaItem.create({
    data: {
      terminId,
      courseId: validated.courseId,
      maxBookings: 50,
      timeStart: formToDbDate(validated.timeStart),
      timeEnd: formToDbDate(validated.timeEnd),
      weekday: validated.day as Weekday,
    },
  });
  return { success: true, msg: `added with id ${newSchemaItem.id}` };
  // } catch (e) {
  //   return { success: false, msg: JSON.stringify(e) };
  // }
}
