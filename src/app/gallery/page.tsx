import { Instagram } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { getVisiblePhotos } from "@/lib/actions/photos";

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

      {/* Gallery Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
            Bilder från studion
          </h2>

          {photos.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Inga bilder uppladdade ännu.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square bg-muted border border-border rounded-lg flex flex-col items-center justify-center hover:border-brand/50 transition-colors cursor-pointer overflow-hidden"
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
                    {photo.event?.headline && (
                      <span className="block text-[10px] text-blue-600 mt-1">
                        Event: {photo.event.headline}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
