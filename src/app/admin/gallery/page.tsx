import {
  deletePhoto,
  getAllPhotos,
  setPhotoVisibility,
  updatePhoto,
} from "@/lib/actions/photos";
import PhotoList from "./PhotoList";
import PhotoUploadForm from "./PhotoUploadForm";

export default async function AdminGalleryPage() {
  const photos = await getAllPhotos();

  async function handleDelete(id: string) {
    "use server";
    await deletePhoto(id);
  }

  async function handleToggleVisibility(id: string, isVisible: boolean) {
    "use server";
    await setPhotoVisibility(id, isVisible);
  }

  async function handleEdit(
    id: string,
    data: {
      url?: string;
      caption?: string | null;
      eventId?: string | null;
      isVisible?: boolean;
    },
  ) {
    "use server";
    await updatePhoto(id, {
      url: data.url ?? undefined,
      caption: data.caption ?? undefined,
      eventId: data.eventId ?? undefined,
      isVisible: data.isVisible,
    });
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Galleri - Hantera bilder</h1>
      <PhotoUploadForm />
      <PhotoList
        photos={photos.map((p) => ({
          id: p.id,
          url: p.url,
          caption: p.caption ?? undefined,
          isVisible: p.isVisible,
          event: p.event
            ? { id: p.event.id, headline: p.event.headline ?? undefined }
            : undefined,
        }))}
        onDelete={handleDelete}
        onToggleVisibility={handleToggleVisibility}
        onEdit={handleEdit}
      />
    </div>
  );
}
