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

    await prisma.startPageContent.upsert({
      where: { id: "singleton" },
      update: validated,
      create: { id: "singleton", ...validated },
    });

    revalidatePath("/");
    revalidatePath("/admin/start");

    return { success: true, msg: "Startsidan har sparats." };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte spara startsidan." };
  }
}
