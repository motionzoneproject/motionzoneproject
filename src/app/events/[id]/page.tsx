import GalleryView from "@/components/GalleryView";
import { getPhotosByEvent } from "@/lib/actions/photos";
import prisma from "@/lib/prisma";

interface PageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default async function EventPage({ params }: PageProps) {
  let realParams = params as { id: string };
  if (
    typeof params === "object" &&
    params !== null &&
    "then" in params &&
    typeof (params as unknown & { then?: unknown }).then === "function"
  ) {
    realParams = (await params) as { id: string };
  }
  let id = realParams?.id;
  if (Array.isArray(id)) id = id[0];
  if (!id || typeof id !== "string") return null;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return null;

  const photos = await getPhotosByEvent(id);

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{event.headline}</h1>
      <p className="text-muted-foreground mb-6">{event.description}</p>

      <section>
        <h2 className="text-xl font-semibold mb-4">Bilder från eventet</h2>
        {photos.length === 0 ? (
          <div className="text-muted-foreground">
            Inga bilder kopplade till detta event ännu.
          </div>
        ) : (
          <GalleryView photos={photos} />
        )}
      </section>
    </main>
  );
}
