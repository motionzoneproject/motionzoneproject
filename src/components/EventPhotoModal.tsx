"use client";

import Image from "next/image";
import * as React from "react";
import { useEffect } from "react";

export default function EventPhotoModal({
  open,
  onClose,
  photos,
  initialIndex = 0,
}: {
  open: boolean;
  onClose: () => void;
  photos: Array<{ id: string; url: string; caption?: string }>;
  initialIndex?: number;
}) {
  const [index, setIndex] = React.useState<number>(initialIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
      if (e.key === "ArrowRight")
        setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, photos.length]);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  if (!open) return null;

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  const next = () => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

  const photo = photos[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/40 px-3 py-2 rounded"
      >
        ✕
      </button>

      <button
        type="button"
        onClick={prev}
        aria-label="Previous photo"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 p-3 rounded-full"
      >
        ‹
      </button>

      <div className="max-w-[95vw] max-h-[90vh] flex items-center justify-center">
        <Image
          src={photo.url}
          alt={photo.caption || "Photo"}
          width={1200}
          height={800}
          style={{ objectFit: "contain", maxWidth: "95vw", maxHeight: "90vh" }}
        />
      </div>

      <button
        type="button"
        onClick={next}
        aria-label="Next photo"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 p-3 rounded-full"
      >
        ›
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm">
        {photo.caption}
      </div>
    </div>
  );
}
