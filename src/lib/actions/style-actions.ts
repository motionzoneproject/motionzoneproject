"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Style } from "@/generated/prisma/client";
import { adminStyleSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();
  return sessiondata?.user.role === "admin";
}

export async function getStyles(): Promise<Style[]> {
  return prisma.style.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function createStyle(formData: z.infer<typeof adminStyleSchema>) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminStyleSchema.parseAsync(formData);

    await prisma.style.create({
      data: {
        name: validated.name,
        description: validated.description,
        imageUrl: validated.imageUrl ?? "",
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Dansstil skapad." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa dansstil." };
  }
}

export async function updateStyle(
  id: string,
  formData: z.infer<typeof adminStyleSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminStyleSchema.parseAsync(formData);

    await prisma.style.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        imageUrl: validated.imageUrl ?? "",
      },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Dansstil uppdaterad." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera dansstil." };
  }
}

export async function deleteStyle(id: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    await prisma.style.delete({
      where: { id },
    });

    revalidatePath("/admin/omoss");
    revalidatePath("/about");

    return { success: true, msg: "Dansstil borttagen." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort dansstil." };
  }
}
