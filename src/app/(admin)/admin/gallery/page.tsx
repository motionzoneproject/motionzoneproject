import { requireAdmin } from "@/lib/actions/admin";
import { formatDateToInputStr } from "@/lib/date-utils";
import prisma from "@/lib/prisma";
import MediaAdmin from "./MediaAdmin";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdmin();
  const [galleryItems, events] = await Promise.all([
    prisma.galleryItem.findMany({
      include: {
        event: {
          select: { id: true, headline: true, headline_en: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.event.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, headline: true, headline_en: true },
    }),
  ]);

  return (
    <MediaAdmin
      items={galleryItems.map((item) => ({
        ...item,
        title_en: item.title_en ?? undefined,
        caption: item.caption ?? undefined,
        caption_en: item.caption_en ?? undefined,
        description: item.description ?? undefined,
        description_en: item.description_en ?? undefined,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        eventId: item.eventId ?? undefined,
        eventHeadline: item.event?.headline ?? undefined,
        eventHeadline_en: item.event?.headline_en ?? undefined,
        createdAt: formatDateToInputStr(item.createdAt),
        updatedAt: formatDateToInputStr(item.updatedAt),
      }))}
      events={events.map((event) => ({
        ...event,
        headline_en: event.headline_en ?? undefined,
      }))}
    />
  );
}
