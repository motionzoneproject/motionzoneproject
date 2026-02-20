"use client";

import { useState } from "react";
import EventPhotoModal from "@/components/EventPhotoModal";
import PhotoCarousel from "@/components/PhotoCarousel";
import PhotoGrid from "@/components/PhotoGrid";

export default function GalleryView({
  photos,
}: {
  photos: Array<{
    id: string;
    url: string;
    caption?: string;
    event?: { id: string; headline?: string } | null | undefined;
  }>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState<number>(0);

  const featured = photos.filter((p) => !p.event).slice(0, 6);

  function openPhoto(photoId: string) {
    const idx = photos.findIndex((x) => x.id === photoId);
    if (idx === -1) return;
    setModalIndex(idx);
    setModalOpen(true);
  }

  return (
    <div>
      {featured.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Utvalda bilder</h3>
          <PhotoCarousel
            photos={featured.map((p) => ({
              id: p.id,
              url: p.url,
              caption: p.caption,
            }))}
            onClick={(id) => openPhoto(id)}
          />
        </section>
      )}

      <section>
        <h3 className="text-xl font-semibold mb-4">Alla bilder</h3>
        <PhotoGrid
          photos={photos.map((p) => ({ ...p, event: p.event ?? undefined }))}
          onClick={(id) => {
            openPhoto(id);
          }}
        />
      </section>

      <EventPhotoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        photos={photos.map((p) => ({
          id: p.id,
          url: p.url,
          caption: p.caption,
        }))}
        initialIndex={modalIndex}
      />
    </div>
  );
}
