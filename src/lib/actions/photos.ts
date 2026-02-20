"use server";

import type { S3ClientConfig } from "@aws-sdk/client-s3";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
  }: {
    url?: string;
    caption?: string;
    eventId?: string | null;
    isVisible?: boolean;
  },
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
  // Fetch photo to get storage key (if any)
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return null;

  // Attempt to remove object from S3 if URL appears to be from configured S3
  try {
    const bucket = process.env.S3_BUCKET;
    const publicUrl = process.env.S3_PUBLIC_URL; // e.g. https://cdn.example.com
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const region = process.env.S3_REGION || "us-east-1";
    const endpoint = process.env.S3_ENDPOINT;

    if (bucket && accessKeyId && secretAccessKey && photo.url) {
      // Try to derive key from URL. Prefer public URL prefix, fallback to pathname.
      let key: string | null = null;
      if (publicUrl && photo.url.startsWith(publicUrl)) {
        key = photo.url.slice(publicUrl.length);
        if (key.startsWith("/")) key = key.slice(1);
      } else {
        try {
          const parsed = new URL(photo.url);
          key = parsed.pathname.replace(/^\//, "");
        } catch (_e) {
          key = null;
        }
      }

      if (key) {
        const s3ClientConfig: S3ClientConfig = {
          region,
          forcePathStyle: true,
          credentials: {
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
          },
        };
        if (endpoint) s3ClientConfig.endpoint = endpoint;
        const s3 = new S3Client(s3ClientConfig);
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        } catch (err) {
          console.error("Failed to delete S3 object for photo", id, key, err);
          // continue to delete DB record even if S3 deletion fails
        }
      }
    }
  } catch (err) {
    console.error(
      "Error while attempting to delete S3 object for photo",
      id,
      err,
    );
  }

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

export async function getPhotosWithoutEvent() {
  return prisma.photo.findMany({
    where: { eventId: null, isVisible: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllPhotos() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("No permission.");
  return prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    include: { event: true },
  });
}
