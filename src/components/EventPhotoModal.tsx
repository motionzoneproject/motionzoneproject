"use client";

import { useEffect } from "react";
import PhotoCarousel from "@/components/PhotoCarousel";

export default function EventPhotoModal({
  open,
  onClose,
  photos,
}: {
  open: boolean;
  onClose: () => void;
  photos: Array<{ id: string; url: string; caption?: string }>;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-4xl mx-4 rounded shadow-lg p-4">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="px-2 py-1">
            Close
          </button>
        </div>
        <PhotoCarousel photos={photos} />
      </div>
    </div>
  );
}
