import Link from "next/link";
import DansStilar from "@/components/dans-stilar";
import LarareProfile from "@/components/larare-profile";

export default function About() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Om vår dansstudio
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            En plats där rörelse möter gemenskap, kreativitet och passion.
          </p>
        </div>
      </section>

      <LarareProfile />
      <DansStilar />

      <section className="relative w-full bg-black overflow-hidden py-28">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/hiphop.jpg')" }}
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black/60" />
        </div>

        <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-brand/40 to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="h-2px w-8 bg-brand" />
                <p className="text-brand-secondary font-semibold tracking-[0.2em] uppercase text-sm">
                  Vår Studio
                </p>
              </div>

              <h2 className="text-4xl md:text-6xl font-light text-white leading-[1.1] tracking-tight mb-6">
                En plats skapad
                <br />
                <span className="font-serif italic text-brand-light">
                  för rörelse
                </span>
              </h2>

              <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-light max-w-md mb-10">
                Vår studio är designad för att kännas inspirerande, trygg och
                professionell. Ljusa salar, speglar och högkvalitativa golv
                skapar den perfekta miljön för dans.
              </p>

              <div className="flex flex-wrap  gap-5 items-center">
                <Link
                  href="/courses"
                  className="px-8 py-3.5 bg-brand text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-white hover:text-black transition-all duration-300 shadow-lg shadow-brand/20"
                >
                  Se kurser
                </Link>
              </div>
              <div className="relative border mt-10 border-brand/30 bg-brand/10 backdrop-blur-sm rounded-2xl p-7 overflow-hidden">
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
