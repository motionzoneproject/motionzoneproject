"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import {
  adminEditEventSchema,
  adminEventSchema,
} from "@/validations/adminforms";
import prisma from "../prisma";
import { isAdminRole } from "./admin-shared";

export async function editNewEvent(
  formData: z.infer<typeof adminEditEventSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  const validated = await adminEditEventSchema.parseAsync(formData);

  try {
    const editedEvent = await prisma.event.update({
      where: { id: validated.id },
      data: {
        headline: validated.headline,
        description: validated.description,
        imageURL: validated.imageURL ?? "",
        link: validated.link ?? "",
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
      },
    });
    revalidatePath("/admin/events");

    return {
      success: true,
      msg: `Event ${editedEvent.headline} uppdaterades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera eventet." };
  }
}

export async function addNewEvent(formData: z.infer<typeof adminEventSchema>) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Validate terminSchema.
    const validated = await adminEventSchema.parseAsync(formData);

    const newEvent = await prisma.event.create({
      data: {
        headline: validated.headline,
        description: validated.description,
        imageURL: validated.imageURL ?? "",
        link: validated.link ?? "",
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
      },
    });
    return {
      success: true,
      msg: `Event ${newEvent.headline} skapades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa eventet." };
  }
}

export async function delEvent(
  eventId: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const del = await prisma.event.delete({
      where: { id: eventId },
    });
    return {
      success: true,
      msg: `${del.headline} togs bort.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Ett fel uppstod vid radering av eventet.",
    };
  }
}
