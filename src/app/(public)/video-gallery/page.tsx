import Image from "next/image";
import { getActiveGalleryItems } from "@/lib/actions/gallery";

/* OBS VIBEKODAD FÖR ATT TESTA VIDEOUPPLADDNINGEN 
   Integrera med riktiga galleriet senare!!! */

export default async function VideoGalleryPage() {
  const items = await getActiveGalleryItems();

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Videogalleri
          </h1>
          <p className="text-muted-foreground">
            Se filmer från våra lektioner och uppträdanden.
          </p>
        </div>
      </section>

      {/* Video Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Inga filmer att visa just nu. Kom tillbaka snart!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl overflow-hidden border border-border bg-muted hover:border-primary/40 transition-colors"
                >
                  {item.type === "VIDEO" ? (
                    <video
                      src={item.url}
                      controls
                      preload="metadata"
                      className="w-full aspect-video object-cover"
                      poster={item.thumbnailUrl ?? undefined}
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <div className="relative aspect-video">
                      <Image
                        src={item.url}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
