"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

const EditPhotoForm = dynamic(() => import("./EditPhotoForm"), { ssr: false });

type Photo = {
  id: string;
  url: string;
  caption?: string;
  isVisible: boolean;
  event?: { id: string; headline: string };
};

interface PhotoListProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onEdit: (id: string, data: Record<string, unknown>) => void;
}

export default function PhotoList({
  photos,
  onDelete,
  onToggleVisibility,
  onEdit,
}: PhotoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  if (!photos?.length) return <div>Inga bilder uppladdade ännu.</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="border rounded p-2 flex flex-col items-center"
        >
          <Image
            src={photo.url}
            alt={photo.caption || "Bild"}
            className="w-full h-32 object-cover rounded mb-2"
            width={400}
            height={128}
            style={{
              width: "100%",
              height: 128,
              objectFit: "cover",
              borderRadius: "0.5rem",
              marginBottom: "0.5rem",
            }}
          />
          {photo.event && (
            <div className="text-xs text-blue-700 mb-1">
              Event: {photo.event.headline}
            </div>
          )}
          {editingId === photo.id ? (
            <EditPhotoForm
              photo={photo}
              onSave={async (id, data) => {
                await onEdit(id, data);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="text-sm mb-1">{photo.caption}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
                  onClick={() => setEditingId(photo.id)}
                >
                  Redigera
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => onDelete(photo.id)}
                >
                  Ta bort
                </button>
                <button
                  type="button"
                  className={`text-xs px-2 py-1 rounded ${photo.isVisible ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"}`}
                  onClick={() => onToggleVisibility(photo.id, !photo.isVisible)}
                >
                  {photo.isVisible ? "Dölj" : "Visa"}
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
