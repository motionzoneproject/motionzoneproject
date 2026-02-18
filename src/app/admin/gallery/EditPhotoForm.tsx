"use client";
import { useEffect, useState } from "react";
import { getAllEvents } from "@/lib/actions/admin";

type Photo = {
  id: string;
  caption?: string;
  eventId?: string;
};

interface EditPhotoFormProps {
  photo: Photo;
  onSave: (
    id: string,
    data: { caption: string; eventId: string },
  ) => Promise<void>;
  onCancel: () => void;
}

export default function EditPhotoForm({
  photo,
  onSave,
  onCancel,
}: EditPhotoFormProps) {
  const [caption, setCaption] = useState(photo.caption || "");
  const [eventId, setEventId] = useState(photo.eventId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<{ id: string; headline: string }[]>([]);

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(photo.id, { caption, eventId });
    } catch (_) {
      setError("Kunde inte spara ändringar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mb-2">
      <label
        htmlFor="edit-caption-input"
        className="block text-sm font-medium mb-1"
      >
        Bildtext
      </label>
      <input
        id="edit-caption-input"
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Bildtext"
        className="border p-1 w-full dark:bg-zinc-900 dark:text-white"
      />
      <label
        htmlFor="edit-event-select"
        className="block text-sm font-medium mb-1 mt-2"
      >
        Välj event (valfritt)
      </label>
      <select
        id="edit-event-select"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="border p-1 w-full dark:bg-zinc-900 dark:text-white"
        aria-label="Välj event (valfritt)"
      >
        <option value="">Välj event (valfritt)</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.headline}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-2 py-1 rounded"
        >
          Spara
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 px-2 py-1 rounded dark:bg-zinc-700 dark:text-white"
        >
          Avbryt
        </button>
      </div>
      {error && <div className="text-red-600 text-xs">{error}</div>}
    </form>
  );
}
