"use client";

import { Filter, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/styles.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { GalleryMediaItem } from "./gallery-types";

type TypeFilter = "ALL" | "IMAGE" | "VIDEO";

// Build the YARL slides array from the filtered items list.
// IMAGE → standard { src, width, height, title, description }
// VIDEO → Video plugin slide { type: "video", sources, poster, title, description }
function buildSlides(items: GalleryMediaItem[]) {
  return items.map((item) => {
    const w = item.width ?? 1920;
    const h = item.height ?? 1080;
    const description = [item.description, item.eventHeadline]
      .filter(Boolean)
      .join(" · ");
    const shared = {
      title: item.title,
      description: description || undefined,
    };
    if (item.type === "VIDEO") {
      return {
        ...shared,
        type: "video" as const,
        width: w,
        height: h,
        poster: item.thumbnailUrl,
        sources: [
          {
            src: item.url,
            type: item.url.endsWith(".webm")
              ? "video/webm"
              : item.url.endsWith(".mov")
                ? "video/quicktime"
                : "video/mp4",
          },
        ],
      };
    }
    return {
      ...shared,
      src: item.url,
      width: w,
      height: h,
    };
  });
}

export default function Gallery({ items }: { items: GalleryMediaItem[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const eventOptions = useMemo(() => {
    const uniqueEvents = new Map<
      string,
      { id: string; headline: string; startDate?: string }
    >();

    for (const item of items) {
      if (!item.eventId || !item.eventHeadline) continue;
      if (!uniqueEvents.has(item.eventId)) {
        uniqueEvents.set(item.eventId, {
          id: item.eventId,
          headline: item.eventHeadline,
          startDate: item.eventStartDate,
        });
      }
    }

    return [...uniqueEvents.values()].sort((left, right) => {
      const leftTime = left.startDate ? new Date(left.startDate).getTime() : 0;
      const rightTime = right.startDate
        ? new Date(right.startDate).getTime()
        : 0;
      return rightTime - leftTime;
    });
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const typeMatches = typeFilter === "ALL" || item.type === typeFilter;
        const eventMatches =
          eventFilter === "ALL" || item.eventId === eventFilter;
        return typeMatches && eventMatches;
      }),
    [eventFilter, items, typeFilter],
  );

  // react-photo-album expects { src, width, height } — fall back to 16:9 if
  // dimensions weren't probed (e.g. items imported before this change).
  const photos = useMemo(
    () =>
      filteredItems.map((item) => ({
        // For videos without a thumbnail we use a 16:9 placeholder src.
        // The actual video URL must NOT be used here — it's not an image.
        src: item.type === "IMAGE" ? item.url : (item.thumbnailUrl ?? ""),
        width: item.width ?? 1920,
        height: item.height ?? 1080,
        key: item.id,
        alt: item.title,
        // Carry through flags so the custom renderer can style video tiles
        isVideo: item.type === "VIDEO",
        isVideoPlaceholder: item.type === "VIDEO" && !item.thumbnailUrl,
      })),
    [filteredItems],
  );

  const slides = useMemo(() => buildSlides(filteredItems), [filteredItems]);

  return (
    <>
      {/* Filter bar */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/70 p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4" />
            Filtrera galleriet
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredItems.length} av {items.length} objekt visas.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="inline-flex rounded-full border border-border bg-background p-1">
            {[
              { value: "ALL", label: "Alla" },
              { value: "IMAGE", label: "Bilder" },
              { value: "VIDEO", label: "Video" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value as TypeFilter)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  typeFilter === option.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-full min-w-55 bg-background sm:w-55">
              <SelectValue placeholder="Alla event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alla event</SelectItem>
              {eventOptions.map((eventOption) => (
                <SelectItem key={eventOption.id} value={eventOption.id}>
                  {eventOption.headline}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <p className="text-lg font-medium text-foreground">
            Inget media matchar filtren.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Prova att visa alla objekt eller byta eventfilter.
          </p>
        </div>
      ) : (
        <MasonryPhotoAlbum
          photos={photos}
          columns={(containerWidth) => {
            if (containerWidth < 640) return 2;
            if (containerWidth < 1024) return 3;
            return 4;
          }}
          spacing={16}
          onClick={({ index }) => setLightboxIndex(index)}
          render={{
            image: (props, { photo }) => {
              const p = photo as typeof photo & {
                isVideo?: boolean;
                isVideoPlaceholder?: boolean;
              };
              const rounded: React.CSSProperties = { borderRadius: "0.5rem" };
              if (p.isVideoPlaceholder) {
                return (
                  <div
                    style={{ ...props.style, ...rounded }}
                    className="flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.75),rgba(2,6,23,0.97))]"
                  >
                    <div className="rounded-full bg-black/60 p-4 backdrop-blur-sm">
                      <Play
                        className="h-8 w-8 text-white"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div
                  style={{
                    ...props.style,
                    ...rounded,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* biome-ignore lint/performance/noImgElement: react-photo-album render.image callback — Next/Image is incompatible here */}
                  <img
                    alt={props.alt}
                    {...props}
                    style={{
                      ...props.style,
                      borderRadius: 0,
                      display: "block",
                    }}
                  />
                  {p.isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm">
                        <Play
                          className="h-6 w-6 text-white"
                          fill="currentColor"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Video, Captions]}
        captions={{ descriptionTextAlign: "center", descriptionMaxLines: 2 }}
        video={{ controls: true, playsInline: true, autoPlay: true }}
      />
    </>
  );
}
