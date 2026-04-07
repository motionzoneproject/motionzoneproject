"use client";

import { Calendar, Clapperboard, Filter, ImageIcon, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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

function formatDate(date?: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export default function UnifiedGalleryClient({
  items,
}: {
  items: GalleryMediaItem[];
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const typeMatches = typeFilter === "ALL" || item.type === typeFilter;
      const eventMatches =
        eventFilter === "ALL" || item.eventId === eventFilter;
      return typeMatches && eventMatches;
    });
  }, [eventFilter, items, typeFilter]);

  const selectedItem = selectedId
    ? (filteredItems.find((item) => item.clientId === selectedId) ?? null)
    : null;
  const selectedImageDimensions = selectedItem
    ? imageDimensions[selectedItem.clientId]
    : undefined;

  useEffect(() => {
    if (selectedId && !selectedItem) {
      setSelectedId(null);
    }
  }, [selectedId, selectedItem]);

  const openItem = (itemId: string) => setSelectedId(itemId);

  return (
    <>
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const thumbnailSrc =
              item.type === "IMAGE"
                ? item.url
                : (item.thumbnailUrl ?? undefined);

            return (
              <button
                key={item.clientId}
                type="button"
                onClick={() => openItem(item.clientId)}
                className="group text-left"
              >
                <article className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-foreground/20 group-hover:shadow-xl">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {thumbnailSrc ? (
                      <Image
                        src={thumbnailSrc}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.7),rgba(2,6,23,0.96))]">
                        <Play
                          className="h-12 w-12 text-white/80"
                          fill="currentColor"
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent opacity-90" />
                    <div className="absolute left-3 top-3 flex gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-black/55 text-white backdrop-blur-sm"
                      >
                        {item.type === "VIDEO" ? (
                          <Clapperboard className="h-3 w-3" />
                        ) : (
                          <ImageIcon className="h-3 w-3" />
                        )}
                        {item.type === "VIDEO" ? "Video" : "Bild"}
                      </Badge>
                    </div>
                    {item.type === "VIDEO" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-black/60 p-4 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                          <Play
                            className="h-7 w-7 text-white"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <div className="text-sm font-semibold md:text-base">
                        {item.title}
                      </div>
                      {item.eventHeadline && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-white/80">
                          <Calendar className="h-3 w-3" />
                          <span>{item.eventHeadline}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent
          className="w-auto max-h-[calc(100vh-1rem)] max-w-[min(1500px,calc(100vw-1rem))] overflow-hidden border-none bg-transparent p-0 shadow-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {selectedItem?.title ?? "Galleriobjekt"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Förhandsvisning av valt galleriobjekt.
          </DialogDescription>

          {selectedItem && (
            <div className="relative flex max-h-[calc(100vh-1rem)] w-fit max-w-[min(1500px,calc(100vw-1rem))] flex-col overflow-hidden rounded-4xl border border-border bg-background text-foreground shadow-2xl">
              <DialogClose className="absolute right-4 top-4 z-20 rounded-full border border-border/80 bg-background/90 p-2 text-foreground transition hover:bg-accent">
                <span className="sr-only">Stäng</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </DialogClose>

              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 px-3 py-12 md:px-6">
                {selectedItem.type === "VIDEO" ? (
                  <video
                    src={selectedItem.url}
                    controls
                    poster={selectedItem.thumbnailUrl ?? undefined}
                    preload="metadata"
                    className="block h-auto max-h-[calc(100vh-14rem)] w-auto max-w-full rounded-2xl bg-black/80 shadow-lg"
                  >
                    <track kind="captions" />
                  </video>
                ) : (
                  <Image
                    src={selectedItem.url}
                    alt={selectedItem.title}
                    width={selectedImageDimensions?.width ?? 1600}
                    height={selectedImageDimensions?.height ?? 1200}
                    sizes="100vw"
                    onLoad={(event) => {
                      const target = event.currentTarget;
                      if (!target.naturalWidth || !target.naturalHeight) return;

                      setImageDimensions((current) => {
                        const existing = current[selectedItem.clientId];

                        if (
                          existing?.width === target.naturalWidth &&
                          existing?.height === target.naturalHeight
                        ) {
                          return current;
                        }

                        return {
                          ...current,
                          [selectedItem.clientId]: {
                            width: target.naturalWidth,
                            height: target.naturalHeight,
                          },
                        };
                      });
                    }}
                    className="block h-auto max-h-[calc(100vh-14rem)] w-auto max-w-full rounded-2xl object-contain shadow-lg"
                    priority
                  />
                )}
              </div>

              <div className="max-h-[30vh] overflow-y-auto border-t border-border bg-card/95 px-5 py-4 md:px-8">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-foreground/10 text-foreground"
                  >
                    {selectedItem.type === "VIDEO" ? "Video" : "Bild"}
                  </Badge>
                  {selectedItem.eventHeadline && (
                    <Badge
                      variant="outline"
                      className="border-border text-foreground/80"
                    >
                      {selectedItem.eventHeadline}
                    </Badge>
                  )}
                </div>

                <h3 className="text-xl font-semibold md:text-2xl">
                  {selectedItem.title}
                </h3>
                {selectedItem.description && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                    {selectedItem.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground md:text-sm">
                  {selectedItem.eventStartDate && (
                    <span>{formatDate(selectedItem.eventStartDate)}</span>
                  )}
                  <span>Uppladdad {formatDate(selectedItem.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
