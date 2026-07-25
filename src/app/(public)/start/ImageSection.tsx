"use client";

import Image from "next/image";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import type { StartPageContent } from "@/generated/prisma/client";

type ImageSectionProps = {
  content: StartPageContent;
};

const cardAccents = [
  {
    accentVar: "var(--color-brand)",
    accentGradient: "from-violet-600 via-brand to-brand-secondary",
  },
  {
    accentVar: "var(--color-brand-secondary)",
    accentGradient: "from-cyan-500 via-brand-secondary to-blue-600",
  },
  {
    accentVar: "var(--color-brand)",
    accentGradient: "from-brand-secondary via-purple-500 to-brand",
  },
] as const;

export default function ImageSection({ content }: ImageSectionProps) {
  const images = [content.image1, content.image2, content.image3].filter(
    (src): src is string => Boolean(src),
  );

  const [lightboxIndex, setLightboxIndex] = useState(-1);

  if (images.length === 0) return null;

  const slides = images.map((src) => ({ src }));

  return (
    <>
      <section
        className="py-14 md:py-20 relative overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full bg-brand/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10 space-y-10">
          {images.map((src, index) => {
            const accent = cardAccents[index % cardAccents.length];
            return (
              <div key={src} className="group relative">
                <div
                  className={`absolute -inset-1 bg-linear-to-r ${accent.accentGradient} rounded-2xl blur-lg opacity-20 group-hover:opacity-50 transition duration-500`}
                />

                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative w-full text-left backdrop-blur-xl bg-card/60 border border-white/10 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 group-hover:scale-[1.01] cursor-zoom-in"
                  aria-label="Visa bilden i full storlek"
                >
                  <div className="relative w-full aspect-[16/10] md:aspect-[16/9]">
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/40 via-transparent to-transparent" />
                  </div>

                  <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
      />
    </>
  );
}
