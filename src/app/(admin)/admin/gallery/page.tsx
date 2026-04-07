import prisma from "@/lib/prisma";
import MediaAdmin from "./MediaAdmin";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [galleryItems, events] = await Promise.all([
    prisma.galleryItem.findMany({
      include: {
        event: {
          select: { id: true, headline: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.event.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, headline: true },
    }),
  ]);

  return (
    <MediaAdmin
      items={galleryItems.map((item) => ({
        ...item,
        caption: item.caption ?? undefined,
        description: item.description ?? undefined,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        eventId: item.eventId ?? undefined,
        eventHeadline: item.event?.headline ?? undefined,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }))}
      events={events}
    />
  );
}
