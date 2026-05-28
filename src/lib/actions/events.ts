"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { formToDbDate } from "@/lib/time-convert";
import { isAdminRole } from "./admin";

export async function createEvent(formData: FormData) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("No permission.");

  const headline = formData.get("headline") as string;
  const startDate = formToDbDate(formData.get("startDate") as string);
  const endDateValue = formData.get("endDate") as string;
  const endDate = endDateValue ? formToDbDate(endDateValue) : null;
  const description = formData.get("description") as string;
  const link = formData.get("link") as string;
  const imageURL = formData.get("imageURL") as string;

  if (!headline || !startDate) {
    throw new Error("Missing required fields");
  }

  await prisma.event.create({
    data: {
      headline,
      startDate,
      endDate: endDate || null,
      description: description || "",
      link: link || "",
      imageURL: imageURL || "",
    },
  });

  revalidatePath("/events");
  revalidatePath("/admin/events");
}

export async function updateEvent(id: string, formData: FormData) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("No permission.");

  const headline = formData.get("headline") as string;
  const startDate = formToDbDate(formData.get("startDate") as string);
  const endDateValue = formData.get("endDate") as string;
  const endDate = endDateValue ? formToDbDate(endDateValue) : null;
  const description = formData.get("description") as string;
  const link = formData.get("link") as string;
  const imageURL = formData.get("imageURL") as string;

  if (!id || !headline || !startDate) {
    throw new Error("Missing required fields");
  }

  await prisma.event.update({
    where: { id },
    data: {
      headline,
      startDate,
      endDate: endDate || null,
      description: description || "",
      link: link || "",
      imageURL: imageURL || "",
    },
  });

  revalidatePath("/events");
  revalidatePath("/admin/events");
}
