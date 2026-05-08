"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Studio } from "@/generated/prisma/client";
import { adminStudioSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();
  return sessiondata?.user.role === "admin";
}

export async function getStudios(lang: "sv" | "en" = "sv"): Promise<Studio[]> {
  return lang === "sv"
    ? prisma.studio.findMany({
        orderBy: {
          name: "asc",
        },
      })
    : prisma.studio.findMany({
        orderBy: {
          name_en: "asc",
        },
      });
}

export async function createStudio(
  formData: z.infer<typeof adminStudioSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminStudioSchema.parseAsync(formData);

    await prisma.studio.create({
      data: {
        name: validated.name,
        name_en: validated.name_en,
        description: validated.description,
        description_en: validated.description_en,
        imageUrl: validated.imageUrl ?? "",
        active: validated.active ?? true,
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Studio skapad." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa studio." };
  }
}

export async function updateStudio(
  id: string,
  formData: z.infer<typeof adminStudioSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminStudioSchema.parseAsync(formData);

    await prisma.studio.update({
      where: { id },
      data: {
        name: validated.name,
        name_en: validated.name_en,
        description: validated.description,
        description_en: validated.description_en,
        imageUrl: validated.imageUrl ?? "",
        active: validated.active ?? true,
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Studio uppdaterad." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera studio." };
  }
}

export async function deleteStudio(id: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    await prisma.studio.delete({
      where: { id },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Studio borttagen." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort studio." };
  }
}
