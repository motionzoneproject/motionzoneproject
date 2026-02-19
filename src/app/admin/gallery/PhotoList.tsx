"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  onDelete: (id: string) => Promise<unknown> | undefined;
  onToggleVisibility: (
    id: string,
    isVisible: boolean,
  ) => Promise<unknown> | undefined;
  onEdit: (
    id: string,
    data: Record<string, unknown>,
  ) => Promise<unknown> | undefined;
}

export default function PhotoList({
  photos,
  onDelete,
  onToggleVisibility,
  onEdit,
}: PhotoListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalPhoto, setModalPhoto] = useState<Photo | null>(null);
  if (!photos?.length) return <div>Inga bilder uppladdade ännu.</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="border rounded p-2 flex flex-col items-center"
        >
          <button
            type="button"
            onClick={() => setModalPhoto(photo)}
            className="w-full"
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
          </button>
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
                  onClick={async () => {
                    await onDelete(photo.id);
                    router.refresh();
                  }}
                >
                  Ta bort
                </button>
                <button
                  type="button"
                  className={`text-xs px-2 py-1 rounded ${photo.isVisible ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"}`}
                  onClick={async () => {
                    await onToggleVisibility(photo.id, !photo.isVisible);
                    router.refresh();
                  }}
                >
                  {photo.isVisible ? "Dölj" : "Visa"}
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      {modalPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background p-4 rounded max-w-5xl w-full mx-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalPhoto(null)}
                className="px-2 py-1"
              >
                Stäng
              </button>
            </div>
            <div className="mt-2">
              <Image
                src={modalPhoto.url}
                alt={modalPhoto.caption || "Bild"}
                width={1200}
                height={800}
                className="object-contain w-full h-[70vh]"
              />
              {modalPhoto.caption && (
                <div className="mt-2 text-sm">{modalPhoto.caption}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
