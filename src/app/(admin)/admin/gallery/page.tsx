import prisma from "@/lib/prisma";
import MediaAdmin from "./MediaAdmin";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [photos, galleryItems, events] = await Promise.all([
    prisma.photo.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.galleryItem.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.event.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, headline: true },
    }),
  ]);

  return (
    <MediaAdmin
      photos={photos.map((photo) => ({
        ...photo,
        caption: photo.caption ?? undefined,
        description: photo.description ?? undefined,
        eventId: photo.eventId ?? undefined,
        createdAt: photo.createdAt.toISOString(),
        updatedAt: photo.updatedAt.toISOString(),
      }))}
      galleryItems={galleryItems.map((item) => ({
        ...item,
        description: item.description ?? undefined,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }))}
      events={events}
    />
  );
}
