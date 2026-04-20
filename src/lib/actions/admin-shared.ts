"use server";

import type { Prisma } from "@/generated/prisma/client";
import { getSessionData } from "./sessiondata";

/**
 * Check if session user is admin.
 * @returns true/false
 * @auth Admin
 */
export async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();

  return sessiondata?.user.role === "admin";
}

export type PrismaTx = Prisma.TransactionClient;
