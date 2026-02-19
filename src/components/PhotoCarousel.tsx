"use client";

import Image from "next/image";
import { useRef } from "react";

export default function PhotoCarousel({
  photos,
}: {
  photos: Array<{ id: string; url: string; caption?: string }>;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  function scroll(amount: number) {
    if (!listRef.current) return;
    listRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-400)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/60 rounded-full shadow"
      >
        ‹
      </button>
      <div
        ref={listRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-6 py-4 scroll-smooth"
      >
        {photos.map((p) => (
          <div key={p.id} className="min-w-[280px] rounded-lg overflow-hidden">
            <Image
              src={p.url}
              alt={p.caption || "Photo"}
              width={640}
              height={480}
              className="object-cover w-full h-56 rounded-lg"
            />
            {p.caption && (
              <div className="text-sm p-2 text-foreground bg-background/80">
                {p.caption}
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(400)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/60 rounded-full shadow"
      >
        ›
      </button>
    </div>
  );
}
