import { requireAdmin } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import MediaAdmin from "./MediaAdmin";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdmin();
  const [galleryItems, events] = await Promise.all([
    prisma.galleryItem.findMany({
      include: {
        event: {
          select: { id: true, headline: true, headline2: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.event.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, headline: true, headline2: true },
    }),
  ]);

  return (
    <MediaAdmin
      items={galleryItems.map((item) => ({
        ...item,
        title2: item.title2 ?? undefined,
        caption: item.caption ?? undefined,
        caption2: item.caption2 ?? undefined,
        description: item.description ?? undefined,
        description2: item.description2 ?? undefined,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        eventId: item.eventId ?? undefined,
        eventHeadline: item.event?.headline ?? undefined,
        eventHeadline2: item.event?.headline2 ?? undefined,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }))}
      events={events.map((event) => ({
        ...event,
        headline2: event.headline2 ?? undefined,
      }))}
    />
  );
}
