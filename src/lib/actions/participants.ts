"use server";

import prisma from "../prisma";
import { formToDbDate } from "../time-convert";
import { getSessionData } from "./sessiondata";

export type ParticipantData = {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  allowPhotoVideo: boolean;
  userId?: string;
};

export async function getParticipantsForUser(userId: string) {
  return prisma.participant.findMany({
    where: { addedByUserId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

export async function getMyParticipants() {
  const session = await getSessionData();
  if (!session) return [];

  return prisma.participant.findMany({
    where: { addedByUserId: session.user.id },
    orderBy: { name: "asc" },
  });
}

export async function getOrCreateParticipant(data: ParticipantData) {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  // If userId is provided, check if we already have a participant for this user added by this manager
  if (data.userId) {
    const existing = await prisma.participant.findFirst({
      where: {
        userId: data.userId,
        addedByUserId: session.user.id,
      },
    });
    if (existing) return existing;
  }

  // Otherwise, check if a user with this email exists to link them automatically
  let userId = data.userId;
  if (!userId && data.email) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (user) userId = user.id;
  }

  // Check if a participant with this name (case-insensitive) already exists for this user
  const existingByName = await prisma.participant.findFirst({
    where: {
      addedByUserId: session.user.id,
      name: {
        equals: data.name.trim(),
        mode: "insensitive",
      },
    },
  });
  if (existingByName) return existingByName;

  // Create new participant record
  return prisma.participant.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: formToDbDate(data.dateOfBirth || ""),
      allowPhotoVideo: data.allowPhotoVideo,
      userId: userId,
      addedByUserId: session.user.id,
    },
  });
}

export async function updateParticipant(
  id: string,
  data: Partial<ParticipantData>,
) {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  // Check if user is admin OR if they are the one who added the participant
  const existing = await prisma.participant.findUnique({
    where: { id },
    select: { addedByUserId: true, userId: true },
  });

  if (!existing) throw new Error("Participant not found");

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && existing.addedByUserId !== session.user.id) {
    throw new Error("No permission to edit this participant");
  }

  // If email changed, we might want to re-link or un-link the userId
  let userId: string | null | undefined = data.userId;
  if (data.email && data.email !== undefined) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    userId = user ? user.id : null;
  }

  return prisma.participant.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      allowPhotoVideo: data.allowPhotoVideo,
      userId: userId !== undefined ? userId : undefined,
      dateOfBirth: data.dateOfBirth
        ? formToDbDate(data.dateOfBirth)
        : undefined,
    },
  });
}
