import { Instagram } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import type { GalleryMediaItem } from "./gallery-types";
import UnifiedGalleryClient from "./UnifiedGalleryClient";

export default async function Page() {
  const [photos, galleryItems] = await Promise.all([
    prisma.photo.findMany({
      where: { isVisible: true },
      include: { event: true },
      orderBy: [{ event: { startDate: "desc" } }, { createdAt: "desc" }],
    }),
    prisma.galleryItem.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const mediaItems: GalleryMediaItem[] = [
    ...photos.map((photo) => ({
      clientId: `photo:${photo.id}`,
      id: photo.id,
      source: "photo" as const,
      type: "IMAGE" as const,
      title: photo.caption?.trim() || photo.event?.headline || "Bild",
      description: photo.description ?? undefined,
      url: photo.url,
      thumbnailUrl: undefined,
      createdAt: photo.createdAt.toISOString(),
      updatedAt: photo.updatedAt.toISOString(),
      sortDate: (photo.event?.startDate ?? photo.createdAt).toISOString(),
      eventId: photo.event?.id,
      eventHeadline: photo.event?.headline,
      eventStartDate: photo.event?.startDate?.toISOString(),
    })),
    ...galleryItems.map((item) => ({
      clientId: `gallery-item:${item.id}`,
      id: item.id,
      source: "gallery-item" as const,
      type: item.type,
      title: item.title,
      description: item.description ?? undefined,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl ?? undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      sortDate: item.createdAt.toISOString(),
      displayOrder: item.displayOrder,
    })),
  ].sort((left, right) => {
    const sortDateDelta =
      new Date(right.sortDate).getTime() - new Date(left.sortDate).getTime();

    if (sortDateDelta !== 0) {
      return sortDateDelta;
    }

    if (left.source === "gallery-item" && right.source === "gallery-item") {
      const orderDelta = (left.displayOrder ?? 0) - (right.displayOrder ?? 0);
      if (orderDelta !== 0) {
        return orderDelta;
      }
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.1] tracking-tight mb-4 animate-fade-in-left [animation-delay:200ms]">
            Bild
            <span className="font-serif italic text-brand-light"> Galleri</span>
          </h1>
          <p className="text-muted-foreground mb-4">
            Se bilder från våra lektioner, uppträdanden och studio.
          </p>
        </div>
      </section>

      {/* Gallery Carousels by Event */}
      <section className="py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6 text-center text-foreground">
            Bilder och video från studion
          </h2>
          <UnifiedGalleryClient items={mediaItems} />
        </div>
      </section>

      {/* Instagram CTA */}
      <section className="py-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="group relative inline-block">
            <div className="absolute -inset-1 bg-linear-to-r from-purple-600 via-pink-500 to-orange-400 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000" />

            <div className="relative backdrop-blur-2xl bg-card/40 border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-tr from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg transform transition-transform duration-500 group-hover:rotate-12">
                  <Instagram className="text-white w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-3xl md:text-4xl font-black mb-2 text-foreground tracking-tight">
                    Följ oss på Instagram
                  </h2>
                  <p className="text-muted-foreground text-lg mb-4">
                    Se fler bilder och håll dig uppdaterad om våra aktiviteter.
                  </p>
                </div>

                <Button
                  asChild
                  className="px-8 py-4 bg-foreground text-background font-bold rounded-full hover:scale-105 transition-transform duration-300"
                >
                  <Link
                    href="https://instagram.com/motionzonevaxjo"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @motionzonevaxjo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
