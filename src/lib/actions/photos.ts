"use server";

import prisma from "../prisma";
import { isAdminRole } from "./admin";

export async function addPhoto({
  url,
  caption,
  eventId,
  isVisible = true,
}: {
  url: string;
  caption?: string;
  eventId?: string;
  isVisible?: boolean;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("No permission.");
  try {
    const photo = await prisma.photo.create({
      data: { url, caption, eventId, isVisible },
    });
    return photo;
  } catch (error) {
    console.error("addPhoto error:", error);
    throw error;
  }
}

export async function updatePhoto(
  id: string,
  {
    url,
    caption,
    eventId,
    isVisible,
  }: { url?: string; caption?: string; eventId?: string; isVisible?: boolean },
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("No permission.");
  return prisma.photo.update({
    where: { id },
    data: { url, caption, eventId, isVisible },
  });
}

export async function deletePhoto(id: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("No permission.");
  return prisma.photo.delete({ where: { id } });
}

export async function setPhotoVisibility(id: string, isVisible: boolean) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("No permission.");
  return prisma.photo.update({
    where: { id },
    data: { isVisible },
  });
}

export async function getVisiblePhotos() {
  return prisma.photo.findMany({
    where: { isVisible: true },
    orderBy: { createdAt: "desc" },
    include: { event: true },
  });
}

export async function getPhotosByEvent(eventId: string) {
  return prisma.photo.findMany({
    where: { eventId, isVisible: true },
    orderBy: { createdAt: "desc" },
  });
}
