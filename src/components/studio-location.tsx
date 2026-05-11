"use client";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
});

export default function StudioLocation() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden w-full py-20 md:py-32">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="h-[2px] w-8 bg-brand" />
              <p className="text-brand-secondary font-bold tracking-[0.2em] uppercase text-sm">
                {t("studio.kicker")}
              </p>
            </div>

            <h2 className="text-4xl md:text-6xl font-light text-foreground leading-tight mb-8">
              {t("studio.titlePrefix")}{" "}
              <span className="font-serif italic text-brand-light">
                {t("studio.titleAccent")}
              </span>{" "}
              {t("studio.titleSuffix")}
            </h2>

            <div className="space-y-6 text-muted-foreground">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-brand" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-foreground font-medium text-lg">
                    {t("studio.addressLabel")}
                  </h4>
                  <p className="text-foreground font-light">
                    Smedsvängen 70
                    <br />
                    352 54 Växjö
                  </p>
                </div>
              </div>

              <p className="text-foreground leading-relaxed font-light max-w-md">
                {t("studio.addressBody")}
              </p>

              <a
                href="https://www.google.com/maps?ll=56.852854,14.820693&z=16&t=m&hl=sv&gl=SE&mapclient=embed&q=Smedsv%C3%A4ngen+70+352+54+V%C3%A4xj%C3%B6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-8 py-3 border shadow border-brand-secondary text-foreground font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-white hover:text-black transition-all duration-300"
              >
                {t("studio.openInMaps")}
              </a>
            </div>
          </div>

          {/* Kart-del */}
          <div className="relative group">
            <div className="absolute -inset-4 border border-brand/20 rounded-2xl shadow-2xl group-hover:border-brand/40 transition-colors duration-500" />

            <div className="relative h-[450px] w-full rounded-xl overflow-hidden ring-1 ring-border">
              <LeafletMap />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
