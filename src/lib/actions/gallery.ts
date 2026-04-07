"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import type { GalleryItemType } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getS3Resources } from "@/lib/s3";
import { isAdminRole } from "./admin";

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

export async function createGalleryItem(data: {
  type: GalleryItemType;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  displayOrder?: number;
  active?: boolean;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.galleryItem.create({ data });

  revalidatePath("/gallery");
  revalidatePath("/video-gallery");
  revalidatePath("/admin/gallery");
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

  revalidatePath("/gallery");
  revalidatePath("/video-gallery");
  revalidatePath("/admin/gallery");
}

export async function deleteGalleryItem(id: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) throw new Error("Galleriobjektet hittades inte");

  // Delete from R2 — derive the object key by stripping the public URL prefix
  const s3 = getS3Resources();
  if (!s3) {
    throw new Error("S3 är inte konfigurerad");
  }

  const key = item.url.startsWith(s3.normalizedPublicUrl)
    ? item.url.slice(s3.normalizedPublicUrl.length).replace(/^\//, "")
    : null;

  if (key) {
    try {
      await s3.client.send(
        new DeleteObjectCommand({
          Bucket: s3.bucket,
          Key: key,
        }),
      );
    } catch (err) {
      console.error(`R2 delete failed for key "${key}":`, err);
      throw new Error("Kunde inte ta bort filen från lagringen");
    }
  } else {
    console.error(
      `deleteGalleryItem: URL "${item.url}" matchar inte S3_PUBLIC_URL "${s3.normalizedPublicUrl}", hoppade över R2-borttagning`,
    );
  }

  await prisma.galleryItem.delete({ where: { id } });

  revalidatePath("/gallery");
  revalidatePath("/video-gallery");
  revalidatePath("/admin/gallery");
}

export async function toggleGalleryItemActive(id: string, active: boolean) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.galleryItem.update({ where: { id }, data: { active } });

  revalidatePath("/gallery");
  revalidatePath("/video-gallery");
  revalidatePath("/admin/gallery");
}
