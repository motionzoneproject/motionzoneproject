import { Instagram } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const galleryItems = [
  {
    id: 1,
    alt: "Danslektion Hip Hop",
    accentGradient: "from-violet-600 via-brand to-brand-secondary",
    accentVar: "var(--color-brand)",
  },
  {
    id: 2,
    alt: "Balett uppträdande",
    accentGradient: "from-cyan-500 via-brand-secondary to-blue-600",
    accentVar: "var(--color-brand-secondary)",
  },
  {
    id: 3,
    alt: "Studio miljö",
    accentGradient: "from-brand-secondary via-purple-500 to-brand",
    accentVar: "var(--color-brand)",
  },
  {
    id: 4,
    alt: "Gruppträning",
    accentGradient: "from-violet-600 via-brand to-brand-secondary",
    accentVar: "var(--color-brand)",
  },
  {
    id: 5,
    alt: "Elevuppvisning",
    accentGradient: "from-cyan-500 via-brand-secondary to-blue-600",
    accentVar: "var(--color-brand-secondary)",
  },
  {
    id: 6,
    alt: "Instruktör demonstration",
    accentGradient: "from-brand-secondary via-purple-500 to-brand",
    accentVar: "var(--color-brand)",
  },
];

export default function Page() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:200ms]">
            Bild
            <span className="font-serif italic text-brand-light"> Galleri</span>
          </h1>
          <p className="text-muted-foreground">
            Se bilder från våra lektioner, uppträdanden och studio.
          </p>
        </div>
      </section>

      {/* Gallery Grid */}
      <section
        id="galleri"
        className="py-20 md:py-32 relative overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand/5 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">
              Bilder från studion
            </h2>
            <p className="text-brand-secondary font-bold animate-pulse max-w-xl mx-auto text-lg">
              Ta en titt in i vår värld
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
            {galleryItems.map((item) => (
              <div key={item.id} className="group relative cursor-pointer">
                <div
                  className={`absolute -inset-1 bg-linear-to-r ${item.accentGradient} rounded-2xl blur-lg opacity-20 group-hover:opacity-50 transition duration-500`}
                />

                <div className="relative h-full backdrop-blur-xl bg-card/60 border border-white/10 rounded-2xl shadow-2xl transform transition-all duration-500 group-hover:scale-[1.03] group-hover:-translate-y-2 flex flex-col overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent z-10" />

                  <div className="relative overflow-hidden aspect-square flex items-center justify-center bg-muted">
                    <span className="text-muted-foreground text-sm z-10 relative">
                      {item.alt}
                    </span>
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                  </div>

                  <div className="p-6 relative">
                    <div
                      className="h-1 rounded-full transition-all duration-500 w-12 group-hover:w-24"
                      style={{ background: item.accentVar }}
                    />
                    <p className="mt-4 text-lg font-bold text-foreground">
                      {item.alt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram CTA */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand/10 blur-[120px]" />
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
                  <h2 className="text-3xl md:text-4xl font-black mb-3 text-foreground tracking-tight">
                    Följ oss på Instagram
                  </h2>
                  <p className="text-muted-foreground text-lg mb-8">
                    Se fler bilder och håll dig uppdaterad om våra aktiviteter.
                  </p>
                </div>

                <Button
                  asChild
                  className="px-8 py-4 bg-foreground text-background font-bold rounded-full hover:scale-105 transition-transform duration-300"
                >
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
    </main>
  );
}
