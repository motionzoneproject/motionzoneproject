"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { LegalPage } from "@/generated/prisma/client";
import { adminLegalPageSchema } from "@/validations/adminforms";
import { sanitizeRichText } from "../dom-sanitize";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();
  return sessiondata?.user.role === "admin";
}

export async function getLegalPages(): Promise<LegalPage[]> {
  return prisma.legalPage.findMany({
    orderBy: { title: "asc" },
  });
}

export async function getLegalPageBySlug(
  slug: string,
): Promise<LegalPage | null> {
  return prisma.legalPage.findUnique({
    where: { slug },
  });
}

export async function updateLegalPage(
  formData: z.infer<typeof adminLegalPageSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminLegalPageSchema.parseAsync(formData);

    await prisma.legalPage.upsert({
      where: { slug: validated.slug },
      update: {
        title: validated.title,
        title_en: validated.title_en,
        content: await sanitizeRichText(validated.content),
        content_en: await sanitizeRichText(validated.content_en),
      },
      create: {
        slug: validated.slug,
        title: validated.title,
        title_en: validated.title_en,
        content: await sanitizeRichText(validated.content),
        content_en: await sanitizeRichText(validated.content_en),
      },
    });

    revalidatePath("/admin/legal");
    revalidatePath(`/${validated.slug}`);

    return { success: true, msg: "Sidan har sparats." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte spara sidan." };
  }
}
