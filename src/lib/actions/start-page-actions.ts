"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { StartPageContent } from "@/generated/prisma/client";
import { adminStartPageSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();
  return sessiondata?.user.role === "admin";
}

const defaults: Omit<StartPageContent, "updatedAt"> = {
  id: "singleton",
  heroImage: "/hero.png",
  heroLabel: "Välkommen till Motion Zone",
  heroTitleLine1: "Dans är",
  heroTitleAccent: "Passion",
  heroTitleLine2: "Och Livet i Rörelse",
  heroSubtext:
    "Upplev dansen på ett helt nytt sätt. Vår studio erbjuder kurser för alla åldrar och nivåer med professionella instruktörer.",
  featuresTitle: "Varför Motion Zone?",
  featuresSubtext:
    "Vi erbjuder en unik dansupplevelse med instruktörer i världsklass och moderna faciliteter",
  feature1Image: "/professionella-instruktörer.png",
  feature1Title: "Professionella instruktörer",
  feature1Description:
    "Våra erfarna lärare har lång erfarenhet och brinner för att dela sin passion för dans.",
  feature2Image: "/flexibla-kurstider.png",
  feature2Title: "Flexibla Kurstider",
  feature2Description:
    "Vi erbjuder kurser på olika tider för att passa ditt schema. Från morgon till kväll, alla dagar.",
  feature3Image: "/moderna-lokaler.png",
  feature3Title: "Moderna Lokaler",
  feature3Description:
    "Vår studio är utrustad med det senaste ljudsystemet och stora speglar för optimal träning.",

  // en:

  heroLabel_en: "Welcome to Motion Zone",
  heroTitleLine1_en: "Dans is",
  heroTitleAccent_en: "Passion",
  heroTitleLine2_en: "And life in motion",
  heroSubtext_en:
    "Experience dance in a whole new way. We have courses for all ages and levels with proffessional instructors.",
  featuresTitle_en: "Why Motion Zone?",
  featuresSubtext_en:
    "We offer an unique experience with instructors in worldclass and modern facitilities",

  feature1Title_en: "Professionell instructors",
  feature1Description_en:
    "Our teachers have a long experience and has a great passion to share it.",

  feature2Title_en: "Flexible times",
  feature2Description_en:
    "We have courses all week at different times to suit your schedule", // Detta stämmer ju inte riktigt, men det får kunden ändra till något som de tycker passar kanske.

  feature3Title_en: "Modern studios",
  feature3Description_en: "Our studios have great sound for music and mirrors.",

  // Image section (NYTT)
  image1: null,
  image2: null,
  image3: null,
};

export async function getStartPageContent(): Promise<StartPageContent> {
  const row = await prisma.startPageContent.findUnique({
    where: { id: "singleton" },
  });
  return row ?? { ...defaults, updatedAt: new Date() };
}

export async function updateStartPageContent(
  formData: z.infer<typeof adminStartPageSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminStartPageSchema.parseAsync(formData);

    const dataToSave = {
      ...validated,
      image1: validated.image1 || null,
      image2: validated.image2 || null,
      image3: validated.image3 || null,
    };

    await prisma.startPageContent.upsert({
      where: { id: "singleton" },
      update: dataToSave,
      create: { id: "singleton", ...dataToSave },
    });

    revalidatePath("/");
    revalidatePath("/admin/start");

    return { success: true, msg: "Startsidan har sparats." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte spara startsidan." };
  }
}
