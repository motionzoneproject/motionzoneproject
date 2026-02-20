"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAllEvents } from "@/lib/actions/admin";
import { addPhoto } from "@/lib/actions/photos";
import { uploadImageFromBlob } from "@/lib/uploads";

interface PhotoUploadFormProps {
  onUpload?: () => void;
}

export default function PhotoUploadForm({ onUpload }: PhotoUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [caption, setCaption] = useState("");
  const [eventId, setEventId] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<{ id: string; headline: string }[]>([]);

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setError("");
    try {
      if (!file) throw new Error("Ingen fil vald");
      const url = await uploadImageFromBlob(file);
      const result = await addPhoto({
        url,
        caption,
        eventId: eventId || undefined,
        isVisible,
      });
      setUploading(false);
      setFile(null);
      setCaption("");
      setEventId("");
      setIsVisible(true);
      if (onUpload) {
        onUpload();
      } else {
        // Refresh server-rendered parent so the new photo appears in the admin list
        router.refresh();
      }
      console.log("Photo added:", result);
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as unknown & { message?: unknown }).message === "string"
      ) {
        setError((err as { message: string }).message);
      } else {
        setError("Upload failed");
      }
      setUploading(false);
      console.error("Photo upload error:", err);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4">
      <div>
        <label
          htmlFor="upload-file-input"
          className="block text-sm font-medium mb-1"
        >
          Välj bildfil
        </label>

        <label
          htmlFor="upload-file-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const f = e.dataTransfer?.files?.[0];
            if (f) setFile(f);
          }}
          className="border-dashed border-2 border-border rounded p-6 text-center cursor-pointer hover:bg-muted/50"
        >
          <p className="text-muted-foreground mb-3">
            Dra och släpp eller klicka för att lägga till en bild
          </p>
          <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded">
            Lägg till bild
          </span>
          {file && (
            <div className="mt-3 text-sm text-muted-foreground">
              Vald fil: {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
        </label>

        <input
          ref={inputRef}
          id="upload-file-input"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const files = e.target.files;
            if (files?.[0]) {
              setFile(files[0]);
            } else {
              setFile(null);
            }
          }}
          className="sr-only"
          required
        />
      </div>
      <label
        htmlFor="upload-caption-input"
        className="block text-sm font-medium mb-1"
      >
        Caption
      </label>
      <input
        id="upload-caption-input"
        type="text"
        placeholder="Bildtext"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="border p-2 w-full"
      />
      <label
        htmlFor="upload-event-select"
        className="block text-sm font-medium mb-1 mt-2"
      >
        Välj event (valfritt)
      </label>
      <select
        id="upload-event-select"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="border p-2 w-full dark:bg-zinc-900 dark:text-white"
        aria-label="Välj event (valfritt)"
      >
        <option value="">Välj event (valfritt)</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.headline}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isVisible}
          onChange={(e) => setIsVisible(e.target.checked)}
        />
        Synlig i galleri
      </label>
      <button
        type="submit"
        disabled={uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {uploading ? "Laddar upp..." : "Ladda upp bild"}
      </button>
      {error && <div className="text-red-600">{error}</div>}
    </form>
  );
}
