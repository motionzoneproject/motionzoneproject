"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EventPhotoModal from "./EventPhotoModal";
import PhotoGrid from "./PhotoGrid";

export default function EventSection({
  event,
  photos,
}: {
  event: { id: string; headline?: string } | null;
  photos: Array<{ id: string; url: string; caption?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [cols, setCols] = useState(2);

  function openAt(id: string) {
    const idx = photos.findIndex((p) => p.id === id);
    if (idx === -1) return;
    setIndex(idx);
    setOpen(true);
  }

  // Determine columns based on window width to show two rows worth of thumbnails
  useEffect(() => {
    function updateCols() {
      const w = window.innerWidth;
      if (w >= 1024) setCols(4);
      else if (w >= 768) setCols(3);
      else setCols(2);
    }
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const title = event ? (event.headline ?? "Event") : "Övriga bilder";
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        {event?.id ? (
          <Link href={`/events/${event.id}`} className="text-sm text-brand">
            Visa fler
          </Link>
        ) : (
          <Link href={`/gallery/others`} className="text-sm text-brand">
            Visa fler
          </Link>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="text-muted-foreground">
          Inga bilder kopplade till detta event ännu.
        </div>
      ) : (
        <PhotoGrid photos={photos.slice(0, cols * 2)} onClick={openAt} />
      )}

      <EventPhotoModal
        open={open}
        onClose={() => setOpen(false)}
        photos={photos}
        initialIndex={index}
      />
    </section>
  );
}
