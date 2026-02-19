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
  const [modalPhotos, setModalPhotos] = useState<
    Array<{ id: string; url: string; caption?: string }>
  >([]);

  const featured = photos.slice(0, 6);

  function openPhoto(photoId: string) {
    const p = photos.find((x) => x.id === photoId);
    if (!p) return;
    setModalPhotos([p]);
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
        photos={modalPhotos}
      />
    </div>
  );
}
