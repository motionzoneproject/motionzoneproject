import DansStilar from "@/components/dans-stilar";
import LarareProfile from "@/components/larare-profile";
import { getStudios } from "@/lib/actions/studio-actions";
import { getStyles } from "@/lib/actions/style-actions";

export default async function About() {
  const [studios, styles] = await Promise.all([getStudios(), getStyles()]);
  const _activeStudios = studios.filter((studio) => studio.active);

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:200ms]">
            Om vår
            <span className="font-serif italic text-brand-light">
              {" "}
              Dansstudio
            </span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            En plats där rörelse möter gemenskap, kreativitet och passion.
          </p>
        </div>
      </section>

      <LarareProfile />
      <DansStilar styles={styles} />

      {/* Studio */}
      <section className="relative w-full bg-black overflow-hidden py-28">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{
              backgroundImage: "url('/hiphop.jpg')",
              animation: "subtlePan 20s ease-in-out infinite alternate",
            }}
          />
          {/* Gradient overlays to match hero */}
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black/60" />
        </div>

        {/* Decorative vertical line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-brand/40 to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left: Text content */}
            <div>
              <div className="flex items-center gap-3 mb-6 animate-fade-in-left">
                <span className="h-[2px] w-8 bg-brand" />
                <p className="text-brand-secondary font-semibold tracking-[0.2em] uppercase text-sm">
                  Vår Studio
                </p>
              </div>

              <h2 className="text-4xl md:text-6xl font-light text-white leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:150ms]">
                En plats skapad
                <br />
                <span className="font-serif italic text-brand-light">
                  för rörelse
                </span>
              </h2>

              <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-light max-w-md mb-10 animate-fade-in-left [animation-delay:300ms]">
                Vår studio är designad för att kännas inspirerande, trygg och
                professionell. Ljusa salar, speglar och högkvalitativa golv
                skapar den perfekta miljön för dans.
              </p>

              <div className="relative border border-brand/30 bg-brand/10 backdrop-blur-sm rounded-2xl p-7 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand rounded-l-2xl" />
                <p className="text-white text-xl font-light leading-snug">
                  Här är alla välkomna –{" "}
                  <span className="font-serif italic text-brand-light">
                    oavsett nivå.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black to-transparent" />
      </section>
    </main>
  );
}
