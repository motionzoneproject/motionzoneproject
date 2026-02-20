import GalleryView from "@/components/GalleryView";
import { getPhotosWithoutEvent } from "@/lib/actions/photos";

export default async function OthersPage() {
  const photos = await getPhotosWithoutEvent();

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Övriga bilder</h1>
      <p className="text-muted-foreground mb-6">
        Bilder som inte är kopplade till något event.
      </p>

      <section>
        {photos.length === 0 ? (
          <div className="text-muted-foreground">
            Inga övriga bilder uppladdade ännu.
          </div>
        ) : (
          <GalleryView
            photos={photos.map((p) => ({
              id: p.id,
              url: p.url,
              caption: p.caption ?? undefined,
            }))}
          />
        )}
      </section>
    </main>
  );
}
