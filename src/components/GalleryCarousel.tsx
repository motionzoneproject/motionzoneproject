import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface Photo {
  url: string;
  caption?: string; // rubrik / headline
  description?: string;
  // `event` can be a simple label string or an object (server may include the whole event)
  event?: string | { headline?: string };
}

interface GalleryCarouselProps {
  photos: Photo[];
  showIndicators?: boolean;
}

export default function GalleryCarousel({
  photos,
  showIndicators = true,
}: GalleryCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
  });
  const [selected, setSelected] = useState(0);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspects, setAspects] = useState<Record<number, number>>({});
  const lastWheelRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!mountedRef.current) return;
        const w = entry.contentRect.width;
        setContainerWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Throttle wheel to avoid rapid changes
      const now = Date.now();
      if (now - lastWheelRef.current < 400) return;
      lastWheelRef.current = now;

      // Only respond to mostly-horizontal gestures (trackpad/scrollwheel horizontal swipes).
      // Let vertical scrolling propagate to the page.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

      // Prevent page from also scrolling during a horizontal swipe gesture.
      e.preventDefault();

      if (e.deltaX > 0) emblaApi?.scrollNext();
      else emblaApi?.scrollPrev();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    const idx = emblaApi?.selectedScrollSnap() ?? 0;
    setSelected(idx);
  }, [emblaApi]);

  useEffect(() => {
    const api = emblaApi;
    if (!api) return;
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  return (
    <div
      ref={containerRef}
      className="relative border border-border rounded-lg"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {photos.map((photo, idx) => {
            const _aspect = aspects[idx];
            // Previously we used computed inline heights; switch to responsive classes
            // to avoid inline styles and satisfy lint rules.

            return (
              <div key={photo.url} className="min-w-full shrink-0 px-2">
                <div className="flex flex-col items-center justify-start py-3">
                  {photo.caption ? (
                    <div className="text-lg md:text-xl font-semibold text-foreground tracking-tight mb-2 text-center px-4">
                      {typeof photo.caption === "string"
                        ? photo.caption
                        : String(photo.caption)}
                    </div>
                  ) : null}

                  <div className="flex flex-col items-center w-full">
                    <div className="relative w-full max-w-6xl mx-auto border border-border/20 rounded-md overflow-hidden">
                      {aspects[idx] && containerWidth ? (
                        (() => {
                          const aspect = aspects[idx];
                          const imgWidth = Math.max(
                            320,
                            Math.min(containerWidth, 1200),
                          );
                          const imgHeight = Math.round(imgWidth * aspect);
                          return (
                            <div className="w-full flex justify-center">
                              <Image
                                src={photo.url}
                                alt={photo.caption || "Gallery photo"}
                                width={imgWidth}
                                height={imgHeight}
                                sizes="(max-width: 1024px) 100vw, 80vw"
                                onLoad={(e) => {
                                  const img =
                                    e.currentTarget as HTMLImageElement;
                                  if (!mountedRef.current) return;
                                  if (img.naturalWidth && img.naturalHeight) {
                                    setAspects((s) => ({
                                      ...s,
                                      [idx]:
                                        img.naturalHeight / img.naturalWidth,
                                    }));
                                  }
                                }}
                                className="object-contain rounded-md bg-transparent border-transparent w-full h-auto max-w-full"
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-[40vh] md:h-[55vh] max-h-[55vh]">
                          <Image
                            src={photo.url}
                            alt={photo.caption || "Gallery photo"}
                            fill
                            sizes="(max-width: 1024px) 100vw, 80vw"
                            onLoad={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              if (!mountedRef.current) return;
                              if (img.naturalWidth && img.naturalHeight) {
                                setAspects((s) => ({
                                  ...s,
                                  [idx]: img.naturalHeight / img.naturalWidth,
                                }));
                              }
                            }}
                            className="object-contain rounded-md bg-transparent border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* caption shown above as rubrik */}

                  {photo.description && (
                    <div className="mt-1 text-base md:text-lg text-muted-foreground text-center px-6 max-w-3xl">
                      <em>
                        {typeof photo.description === "string"
                          ? photo.description
                          : String(photo.description)}
                      </em>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/30 dark:bg-black/30 backdrop-blur-sm hover:bg-white/50 dark:hover:bg-black/50 p-3 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition"
        aria-label="Föregående"
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>

      <button
        type="button"
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/30 dark:bg-black/30 backdrop-blur-sm hover:bg-white/50 dark:hover:bg-black/50 p-3 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition"
        aria-label="Nästa"
      >
        <ChevronRight className="w-5 h-5 text-foreground" />
      </button>

      {showIndicators && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {photos.map((p, i) => (
            <button
              key={p.url}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Gå till bild ${i + 1}`}
              className={`w-3 h-3 rounded-full ${i === selected ? "bg-foreground" : "bg-muted"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
