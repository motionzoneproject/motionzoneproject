"use server";

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import type { GalleryItemType } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { isAdminRole } from "./admin";

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Get all active gallery items ordered by displayOrder (public). */
export async function getActiveGalleryItems() {
  return prisma.galleryItem.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
}

/** Get all gallery items (admin). */
export async function getAllGalleryItems() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  return prisma.galleryItem.findMany({
    orderBy: { displayOrder: "asc" },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createGalleryItem(data: {
  type: GalleryItemType;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  displayOrder?: number;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.galleryItem.create({ data });

  revalidatePath("/video-gallery");
  revalidatePath("/admin/video-gallery");
}

export async function updateGalleryItem(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    url: string;
    thumbnailUrl: string;
    displayOrder: number;
    active: boolean;
  }>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.galleryItem.update({ where: { id }, data });

  revalidatePath("/video-gallery");
  revalidatePath("/admin/video-gallery");
}

export async function deleteGalleryItem(id: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) throw new Error("Galleriobjektet hittades inte");

  // Delete from R2 — derive the object key by stripping the public URL prefix
  const publicUrl = process.env.S3_PUBLIC_URL ?? "";
  const key = item.url.startsWith(publicUrl)
    ? item.url.slice(publicUrl.length).replace(/^\//, "")
    : null;

  if (key) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET ?? "",
        Key: key,
      }),
    );
  }

  await prisma.galleryItem.delete({ where: { id } });

  revalidatePath("/video-gallery");
  revalidatePath("/admin/video-gallery");
}

export async function toggleGalleryItemActive(id: string, active: boolean) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.galleryItem.update({ where: { id }, data: { active } });

  revalidatePath("/video-gallery");
  revalidatePath("/admin/video-gallery");
}
