import { Instagram } from "lucide-react";

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
      <section className="py-16 relative overflow-hidden">
        {/* Bakgrunds-glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand/10 blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="group relative inline-block">
            {/* Gradient Glow bakom kortet */}
            <div className="absolute -inset-1 bg-linear-to-r from-purple-600 via-pink-500 to-orange-400 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>

            {/* Själva kortet */}
            <div className="relative backdrop-blur-2xl bg-card/40 border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                {/* Instagram Ikon Cirkel */}
                <div className="w-20 h-20 rounded-2xl bg-linear-to-tr from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg transform transition-transform duration-500 group-hover:rotate-12">
                  <Instagram className="text-white w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-3xl md:text-4xl font-black mb-3 text-foreground tracking-tight">
                    Följ oss på Instagram
                  </h2>
                  <p className="text-muted-foreground text-lg mb-8">
                    Se fler bilder och håll dig uppdaterad om våra aktiviteter.
                  </p>
                </div>

                <a
                  href="https://instagram.com/motionzonevaxjo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-bold rounded-full hover:scale-105 transition-transform duration-300"
                >
                  @motionzonevaxjo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
