"use client";

import Image from "next/image";
import Link from "next/link";

export default function PhotoGrid({
  photos,
  onClick,
}: {
  photos: Array<{
    id: string;
    url: string;
    caption?: string;
    event?: { id: string; headline?: string } | null;
  }>;
  onClick?: (photoId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onClick?.(photo.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClick?.(photo.id);
          }}
          className="aspect-square bg-muted border border-border rounded-lg flex flex-col items-center justify-center overflow-hidden relative cursor-pointer"
        >
          <Image
            src={photo.url}
            alt={photo.caption || "Bild"}
            width={400}
            height={300}
            className="object-cover w-full h-3/4 rounded-t-lg"
            style={{ width: "100%", height: "75%" }}
          />
          <div className="w-full px-2 py-1 text-xs text-center text-foreground bg-background/80">
            {photo.caption}
          </div>
          {photo.event && (
            <Link
              href={`/events/${photo.event.id}`}
              className="absolute top-2 left-2 bg-brand text-white text-xs px-2 py-1 rounded"
            >
              {photo.event.headline ? "Event" : "Event"}
            </Link>
          )}
        </button>
      ))}
    </div>
  );
}
