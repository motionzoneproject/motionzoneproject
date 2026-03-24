"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

type Photo = {
  id: string;
  url: string;
  caption?: string | undefined;
  description?: string | undefined;
  createdAt: string;
  updatedAt: string;
  isVisible: boolean;
};

type Group = {
  event: { id: string; headline: string; startDate: string };
  photos: Photo[];
};

const GalleryCarousel = dynamic(
  () => import("@/components/GalleryCarousel").then((m) => m.default ?? m),
  {
    ssr: false,
  },
) as unknown as ComponentType<{ photos: Photo[]; showIndicators?: boolean }>;

export default function GalleryCarouselsClient({
  grouped,
  unlinked,
}: {
  grouped: Group[];
  unlinked: Photo[];
}) {
  if (!Array.isArray(grouped)) {
    console.error("GalleryCarouselsClient: expected 'grouped' array", grouped);
    return null;
  }
  return (
    <>
      {grouped.map((gItem) => {
        const item = gItem as unknown;
        let eventObj: Record<string, unknown> | null = null;
        let photosArr: Photo[] = [];

        if (typeof item === "object" && item !== null) {
          const rec = item as Record<string, unknown>;
          if ("event" in rec && "photos" in rec) {
            eventObj = (rec.event as Record<string, unknown>) ?? null;
            photosArr = (rec.photos as Photo[]) ?? [];
          } else if ("headline" in rec) {
            // sometimes the grouped item may already be the event object
            eventObj = rec;
            photosArr = (rec.photos as Photo[]) ?? [];
          } else {
            // unexpected shape
            console.error(
              "GalleryCarouselsClient: unexpected grouped item",
              rec,
            );
          }
        }

        type EventRecord = {
          id?: string;
          headline?: string;
          startDate?: string;
        };
        const er = eventObj as EventRecord | null;
        const headline = er?.headline ? String(er.headline) : "";
        const startDateStr = er?.startDate
          ? new Date(String(er.startDate)).toLocaleDateString()
          : "";
        const key = String(
          er?.id ?? headline ?? Math.random().toString(36).slice(2, 9),
        );

        return (
          <div key={key} className="mb-16">
            <div className="mb-2 text-center">
              <h3 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                {headline}
              </h3>
              <div className="text-sm uppercase tracking-wide text-muted-foreground mt-1">
                {startDateStr}
              </div>
            </div>
            <div>
              <GalleryCarousel
                photos={photosArr.filter((p) => p.isVisible)}
                showIndicators={false}
              />
            </div>
          </div>
        );
      })}
      {unlinked.length > 0 && (
        <div className="mb-16">
          <div className="mb-2 text-center">
            <h3 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Övriga bilder
            </h3>
          </div>
          <div>
            <GalleryCarousel
              photos={unlinked.filter((p) => p.isVisible)}
              showIndicators={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
