"use server";

import type { Termin } from "@/generated/prisma/client";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

// Lika bra att exportera denna tänker jag.
export const isAdmin = async () => {
  const sessiondata = await getSessionData();

  if (sessiondata?.user.role === "admin") return true;
  return false;
};

// Inser att det är svengelska. Men men.
export async function getTermin(): Promise<Termin[]> {
  if (!isAdmin) return [];

  // Behövs mer säkerhet än såhär?

  const terminer = await prisma.termin.findMany();
  return terminer;
}
