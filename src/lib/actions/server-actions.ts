"use server";

import type { Event } from "@/generated/prisma/client";
import prisma from "../prisma";

export async function getEvents(): Promise<Event[]> {
  const events = await prisma.event.findMany();

  return events;
}
