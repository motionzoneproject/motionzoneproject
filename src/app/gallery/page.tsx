import { Instagram } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const galleryItems = [
  { id: 1, alt: "Danslektion Hip Hop" },
  { id: 2, alt: "Balett uppträdande" },
  { id: 3, alt: "Studio miljö" },
  { id: 4, alt: "Gruppträning" },
  { id: 5, alt: "Elevuppvisning" },
  { id: 6, alt: "Instruktör demonstration" },
];

export default function Page() {
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="aspect-square bg-muted border border-border rounded-lg flex items-center justify-center hover:border-brand/50 transition-colors cursor-pointer"
              >
                <span className="text-muted-foreground text-sm">
                  {item.alt}
                </span>
              </div>
            ))}
          </div>
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
