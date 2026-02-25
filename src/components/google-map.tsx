"use client";

import { MapPin } from "lucide-react";

export default function GoogleMap() {
  // Google Maps URL för Smedsvängen 70, Växjö
  const mapSrc =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2182.235478465714!2d14.819323377344465!3d56.84164887334704!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x465723eb71a80d5b%3A0x6e268923a1f33f6a!2sSmedsv%C3%A4ngen%2070%2C%20352%2054%20V%C3%A4xj%C3%B6!5e0!3m2!1ssv!2sse!4v1700000000000!5m2!1ssv!2sse";

  return (
    <section className="relative w-full py-24">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="h-2px w-8 bg-brand" />
              <p className="text-brand-secondary  animate-pulse font-bold tracking-[0.2em] uppercase text-sm">
                Hitta till oss
              </p>
            </div>

            <h2 className="text-4xl md:text-6xl font-light  text-foreground leading-tight mb-8">
              Besök vår{" "}
              <span className="font-serif italic text-brand-light">Studio</span>{" "}
              i Växjö
            </h2>

            <div className="space-y-6 text-zinc-300">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-brand" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-foreground font-medium text-lg">
                    Adress
                  </h4>
                  <p className="text-foreground font-light">
                    Smedsvängen 70
                    <br />
                    352 54 Växjö
                  </p>
                </div>
              </div>

              <p className="text-foreground leading-relaxed font-light max-w-md">
                Vi finns belägna i moderna lokaler anpassade för rörelse och
                kreativitet.
              </p>

              <a
                href="https://www.google.com/maps?ll=56.852854,14.820693&z=16&t=m&hl=sv&gl=SE&mapclient=embed&q=Smedsv%C3%A4ngen+70+352+54+V%C3%A4xj%C3%B6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-8 py-3 border shadow border-brand-secondary text-foreground font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-white hover:text-black transition-all duration-300"
              >
                Öppna i Google Maps
              </a>
            </div>
          </div>

          {/* Kart-del */}
          <div className="relative group">
            {/* Dekorativ ram bakom kartan */}
            <div className="absolute -inset-4 border border-brand/20 rounded-2xl shadow-2xl group-hover:border-brand/40 transition-colors duration-500" />

            <div className="relative h-[450px] w-full rounded-xl overflow-hidden grayscale-[0.8] hover:grayscale-0 transition-all duration-700 ">
              <iframe
                src={mapSrc}
                title="Karta över MotionZone"
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="opacity-80 group-hover:opacity-100 transition-opacity duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
