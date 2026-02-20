import { Instagram } from "lucide-react";
import Link from "next/link";
import EventSection from "@/components/EventSection";
import { Button } from "@/components/ui/button";

import { getVisiblePhotos } from "@/lib/actions/photos";

// const GalleryView = dynamic(() => import("@/components/GalleryView"), { ssr: false });

export default async function Page() {
  const photos = await getVisiblePhotos();

  // Group photos by event id (including null for no event)
  const byEvent = new Map<string | null, Array<(typeof photos)[0]>>();
  for (const p of photos) {
    const key = p.event?.id ?? null;
    const arr = byEvent.get(key) ?? [];
    arr.push(p);
    byEvent.set(key, arr);
  }

  const eventGroups = Array.from(byEvent.entries()).filter(
    ([k]) => k !== null,
  ) as Array<[string, Array<(typeof photos)[0]>]>;
  const unlinked = byEvent.get(null) ?? [];

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Galleri
          </h1>
          <p className="text-muted-foreground">
            Se bilder från våra lektioner, uppträdanden och studio.
          </p>
        </div>
      </section>

      {/* Gallery View (client) */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6 text-center text-foreground">
            Bilder från studion
          </h2>
          {photos.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Inga bilder uppladdade ännu.
            </div>
          ) : (
            <div>
              {eventGroups.length > 0 ? (
                eventGroups.map(([eventId, group]) => (
                  <EventSection
                    key={eventId}
                    event={{ id: eventId, headline: group[0].event?.headline }}
                    photos={group.map((p) => ({
                      id: p.id,
                      url: p.url,
                      caption: p.caption ?? undefined,
                    }))}
                  />
                ))
              ) : (
                <div className="text-muted-foreground mb-6">
                  Inga eventkopplade bilder ännu.
                </div>
              )}

              <EventSection
                event={null}
                photos={unlinked.map((p) => ({
                  id: p.id,
                  url: p.url,
                  caption: p.caption ?? undefined,
                }))}
              />
            </div>
          )}
        </div>
      </section>

      {/* Instagram CTA */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-md mx-auto px-6 text-center">
          <Instagram className="w-12 h-12 mx-auto mb-4 text-brand" />
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            Följ oss på Instagram
          </h2>
          <p className="text-muted-foreground mb-6">
            Se fler bilder och håll dig uppdaterad om våra aktiviteter.
          </p>
          <Button asChild className="bg-brand hover:bg-brand-light text-white">
            <Link
              href="https://instagram.com/motionzonevaxjo"
              target="_blank"
              rel="noopener noreferrer"
            >
              @motionzonevaxjo
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
