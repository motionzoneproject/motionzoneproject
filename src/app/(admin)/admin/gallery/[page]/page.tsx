import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import GalleryAdmin from "../GalleryAdmin";

type Props = { params: Promise<{ page: string }> };

export const dynamic = "force-dynamic";

export default async function Page({ params }: Props) {
  const resolved = await params;
  const page = Math.max(1, Number(resolved.page ?? 1));
  const pageSize = 12;

  const total = await prisma.photo.count();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (page > totalPages) return notFound();

  const photos = await prisma.photo.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  // Normalize nullable fields (Prisma may return `null`) to `undefined` to match
  // the `Photo` type expectations in client components.
  const normalizedPhotos = photos.map((p) => ({
    ...p,
    caption: p.caption ?? undefined,
    description: p.description ?? undefined,
    eventId: p.eventId ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, headline: true },
  });

  return (
    <GalleryAdmin
      key={page}
      photos={normalizedPhotos}
      events={events}
      currentPage={page}
      totalPages={totalPages}
    />
  );
}
