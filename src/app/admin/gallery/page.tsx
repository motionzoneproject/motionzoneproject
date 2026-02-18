"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

const PhotoUploadForm = dynamic(() => import("./PhotoUploadForm"), {
  ssr: false,
});

export default function AdminGalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/photos");
      if (!res.ok) throw new Error("Kunde inte hämta bilder");
      const data = await res.json();
      setPhotos(data);
    } catch (_err) {
      setError("Fel vid hämtning av bilder");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPhotos();
  }, [fetchPhotos]);

  const PhotoList = dynamic(() => import("./PhotoList"), { ssr: false });

  async function handleDelete(id: string) {
    await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
    fetchPhotos();
  }

  async function handleToggleVisibility(id: string, isVisible: boolean) {
    await fetch(`/api/admin/photos/${id}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible }),
    });
    fetchPhotos();
  }

  async function handleEdit(id: string, data: Record<string, unknown>) {
    await fetch(`/api/admin/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchPhotos();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Galleri - Hantera bilder</h1>
      <PhotoUploadForm onUpload={fetchPhotos} />
      {loading ? (
        <div>Laddar bilder...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <PhotoList
          photos={photos}
          onDelete={handleDelete}
          onToggleVisibility={handleToggleVisibility}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}
