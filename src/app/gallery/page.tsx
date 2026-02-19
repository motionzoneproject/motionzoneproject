import { Instagram } from "lucide-react";
import Link from "next/link";
import GalleryView from "@/components/GalleryView";
import { Button } from "@/components/ui/button";

import { getVisiblePhotos } from "@/lib/actions/photos";

// const GalleryView = dynamic(() => import("@/components/GalleryView"), { ssr: false });

export default async function Page() {
  const photos = await getVisiblePhotos();
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
            <GalleryView
              photos={photos.map((p) => ({
                id: p.id,
                url: p.url,
                caption: p.caption ?? undefined,
                event: p.event
                  ? { id: p.event.id, headline: p.event.headline ?? undefined }
                  : undefined,
              }))}
            />
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
