"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import type { GalleryItemType } from "@/generated/prisma/client";
import { probeImageDimensions } from "@/lib/imageUtils";
import prisma from "@/lib/prisma";
import { getS3Resources } from "@/lib/s3";
import { isAdminRole } from "./admin";

function revalidateGalleryPaths() {
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");
}

function normalizeGalleryItemData(data: {
  type: GalleryItemType;
  title: string;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  displayOrder?: number;
  active?: boolean;
  eventId?: string | null;
  caption?: string;
  caption_en?: string | null;
}) {
  const title = data.title.trim();
  const title_en = data.title_en?.trim() || null;
  const caption = data.type === "IMAGE" ? data.caption?.trim() || title : null;
  const caption_en =
    data.type === "IMAGE" ? data.caption_en?.trim() || title_en : null;

  return {
    type: data.type,
    title,
    title_en,
    caption,
    caption_en,
    description: data.description || null,
    description_en: data.description_en || null,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl || null,
    width: data.width ?? null,
    height: data.height ?? null,
    displayOrder: data.displayOrder ?? 0,
    active: data.active ?? true,
    eventId: data.eventId || null,
  };
}

/** Get all active gallery items sorted by event start date (desc), then displayOrder (asc), then createdAt (desc) — (public). */
export async function getActiveGalleryItems() {
  const items = await prisma.galleryItem.findMany({
    where: { active: true },
    include: { event: true },
    orderBy: [
      { event: { startDate: "desc" } },
      { displayOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.caption?.trim() || item.title,
    title_en: item.caption_en?.trim() || item.title_en || undefined,
    description: item.description ?? undefined,
    description_en: item.description_en ?? undefined,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    width: item.width ?? undefined,
    height: item.height ?? undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    sortDate: (item.event?.startDate ?? item.createdAt).toISOString(),
    displayOrder: item.displayOrder,
    eventId: item.event?.id,
    eventHeadline: item.event?.headline,
    eventHeadline_en: item.event?.headline_en ?? undefined,
    eventStartDate: item.event?.startDate?.toISOString(),
  }));
}

/** Get all gallery items (admin). */
export async function getAllGalleryItems() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  return prisma.galleryItem.findMany({
    include: { event: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function createGalleryItem(data: {
  type: GalleryItemType;
  title: string;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  displayOrder?: number;
  active?: boolean;
  eventId?: string | null;
  caption?: string;
  caption_en?: string | null;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  let width: number | null = null;
  let height: number | null = null;

  if (data.type === "IMAGE") {
    const dims = await probeImageDimensions(data.url);
    width = dims?.width ?? null;
    height = dims?.height ?? null;
  } else {
    width = 1920;
    height = 1080;
  }

  await prisma.galleryItem.create({
    data: normalizeGalleryItemData({ ...data, width, height }),
  });

  revalidateGalleryPaths();
}

export async function updateGalleryItem(
  id: string,
  data: Partial<{
    type: GalleryItemType;
    title: string;
    title_en: string | null;
    caption: string;
    caption_en: string | null;
    description: string | null;
    description_en: string | null;
    url: string;
    thumbnailUrl: string | null;
    displayOrder: number;
    active: boolean;
    eventId: string | null;
  }>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  const existingItem = await prisma.galleryItem.findUnique({ where: { id } });
  if (!existingItem) throw new Error("Galleriobjektet hittades inte");

  const nextType = data.type ?? existingItem.type;
  const nextTitle = data.title ?? existingItem.title;
  const nextTitle_en = data.title_en ?? existingItem.title_en ?? undefined;
  const nextUrl = data.url ?? existingItem.url;
  const urlChanged = nextUrl !== existingItem.url;

  let width = existingItem.width;
  let height = existingItem.height;

  if (urlChanged || width === null || height === null) {
    if (nextType === "IMAGE") {
      const dims = await probeImageDimensions(nextUrl);
      width = dims?.width ?? null;
      height = dims?.height ?? null;
    } else {
      width = 1920;
      height = 1080;
    }
  }

  await prisma.galleryItem.update({
    where: { id },
    data: normalizeGalleryItemData({
      type: nextType,
      title: nextTitle,
      title_en: nextTitle_en,
      caption: data.caption ?? existingItem.caption ?? undefined,
      caption_en: data.caption_en ?? existingItem.caption_en ?? undefined,
      description:
        data.description !== undefined
          ? data.description
          : existingItem.description,
      description_en:
        data.description_en !== undefined
          ? data.description_en
          : existingItem.description_en,
      url: nextUrl,
      thumbnailUrl:
        data.thumbnailUrl !== undefined
          ? data.thumbnailUrl
          : existingItem.thumbnailUrl,
      width,
      height,
      displayOrder: data.displayOrder ?? existingItem.displayOrder,
      active: data.active ?? existingItem.active,
      eventId: data.eventId !== undefined ? data.eventId : existingItem.eventId,
    }),
  });

  revalidateGalleryPaths();
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

  const extractKey = (url: string) =>
    url.startsWith(s3.normalizedPublicUrl)
      ? url.slice(s3.normalizedPublicUrl.length).replace(/^\//, "")
      : null;

  const deleteFromR2 = async (url: string, label: string) => {
    const key = extractKey(url);
    if (!key) {
      console.error(
        `deleteGalleryItem: ${label} URL "${url}" matchar inte S3_PUBLIC_URL "${s3.normalizedPublicUrl}", hoppade över R2-borttagning`,
      );
      return;
    }
    try {
      await s3.client.send(
        new DeleteObjectCommand({ Bucket: s3.bucket, Key: key }),
      );
    } catch (err) {
      console.error(`R2 delete failed for ${label} key "${key}":`, err);
      throw new Error("Kunde inte ta bort filen från lagringen");
    }
  };

  await deleteFromR2(item.url, "url");

  if (item.thumbnailUrl) {
    await deleteFromR2(item.thumbnailUrl, "thumbnailUrl");
  }

  await prisma.galleryItem.delete({ where: { id } });

  revalidateGalleryPaths();
}

export async function toggleGalleryItemActive(id: string, active: boolean) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  await prisma.galleryItem.update({ where: { id }, data: { active } });

  revalidateGalleryPaths();
}
