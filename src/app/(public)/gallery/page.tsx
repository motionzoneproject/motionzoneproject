import { Instagram } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getActiveGalleryItems } from "@/lib/actions/gallery";
import Gallery from "./Gallery";

export const metadata: Metadata = {
  title: "Bild & Videogalleri",
  description:
    "Bilder och videor från MotionZone Växjös event, uppvisningar och vardagsträning.",
};

export default async function Page() {
  const mediaItems = await getActiveGalleryItems();

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="py-16 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.1] tracking-tight mb-4 animate-fade-in-left [animation-delay:200ms]">
            Bild & Video
            <span className="font-serif italic text-brand-light"> Galleri</span>
          </h1>
          <p className="text-muted-foreground mb-4">
            Se bilder och videor från våra lektioner, uppträdanden och studio.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-6">
          <Gallery items={mediaItems} />
        </div>
      </section>

      {/* Instagram CTA */}
      <section className="py-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="group relative inline-block">
            <div className="absolute -inset-1 bg-linear-to-r from-purple-600 via-pink-500 to-orange-400 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000" />

            <div className="relative backdrop-blur-2xl bg-card/40 border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-tr from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg transform transition-transform duration-500 group-hover:rotate-12">
                  <Instagram className="text-white w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-3xl md:text-4xl font-black mb-2 text-foreground tracking-tight">
                    Följ oss på Instagram
                  </h2>
                  <p className="text-muted-foreground text-lg mb-4">
                    Se fler bilder och håll dig uppdaterad om våra aktiviteter.
                  </p>
                </div>

                <Button asChild variant="cta">
                  <Link
                    href="https://instagram.com/motionzonevaxjo"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @motionzonevaxjo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
