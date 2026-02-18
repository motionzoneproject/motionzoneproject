import Image from "next/image";
import { getPhotosByEvent } from "@/lib/actions/photos";
import prisma from "@/lib/prisma";

interface PageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default async function AdminEventPage({ params }: PageProps) {
  // Next.js App Router kan leverera params som Promise!
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
  if (!id || typeof id !== "string") {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded">
        <b>404 - Event hittades inte</b>
        <div>
          <b>params:</b> {JSON.stringify(params)}
        </div>
        <div>
          <b>id:</b> {JSON.stringify(id)}
        </div>
        <div>
          <b>Event från Prisma:</b> null
        </div>
      </div>
    );
  }

  const event = await prisma.event.findUnique({
    where: { id },
  });

  // DEBUG: Visa params och event för felsökning
  if (!event) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded">
        <b>404 - Event hittades inte</b>
        <div>
          <b>params:</b> {JSON.stringify(params)}
        </div>
        <div>
          <b>id:</b> {JSON.stringify(id)}
        </div>
        <div>
          <b>Event från Prisma:</b> null
        </div>
      </div>
    );
  }

  const photos = await getPhotosByEvent(id);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{event.headline}</h1>
      <p className="mb-6 text-muted-foreground">{event.description}</p>

      <h2 className="text-xl font-semibold mb-4">
        Bilder kopplade till eventet
      </h2>
      {photos.length === 0 ? (
        <div className="text-muted-foreground mb-8">
          Inga bilder kopplade till detta event ännu.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square bg-muted border border-border rounded-lg flex flex-col items-center justify-center overflow-hidden"
            >
              <Image
                src={photo.url}
                alt={photo.caption || "Bild"}
                className="object-cover w-full h-3/4 rounded-t-lg"
                width={400}
                height={300}
                style={{ width: "100%", height: "75%" }}
              />
              <div className="w-full px-2 py-1 text-xs text-center text-foreground bg-background/80">
                {photo.caption}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
