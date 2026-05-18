"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import type { StartPageContent } from "@/generated/prisma/client";
import { pick } from "@/lib/i18n/pick";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

type FeaturesProps = {
  content: StartPageContent;
};

// Design-coupled accent colours stay fixed per card position (not content-driven)
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

export default function Features({ content }: FeaturesProps) {
  const { i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);

  const features = [
    {
      image: content.feature1Image,
      title: pick(content, "feature1Title", lang),
      description: pick(content, "feature1Description", lang),
      ...cardAccents[0],
    },
    {
      image: content.feature2Image,
      title: pick(content, "feature2Title", lang),
      description: pick(content, "feature2Description", lang),
      ...cardAccents[1],
    },
    {
      image: content.feature3Image,
      title: pick(content, "feature3Title", lang),
      description: pick(content, "feature3Description", lang),
      ...cardAccents[2],
    },
  ];

  return (
    <section
      id="varfor"
      className="py-14 md:py-20 relative overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">
            {pick(content, "featuresTitle", lang)}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            {pick(content, "featuresSubtext", lang)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {features.map((feature) => (
            <div key={feature.title} className="group relative">
              <div
                className={`absolute -inset-1 bg-linear-to-r ${feature.accentGradient} rounded-2xl blur-lg opacity-20 group-hover:opacity-50 transition duration-500`}
              ></div>

              <div className="relative h-full backdrop-blur-xl bg-card/60 border border-white/10 rounded-2xl shadow-2xl transform transition-all duration-500 group-hover:scale-[1.03] group-hover:-translate-y-2 flex flex-col overflow-hidden">
                <div className="relative overflow-hidden h-60 flex items-center justify-center bg-linear-to-b from-transparent to-black/20">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={500}
                    height={400}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent to-transparent opacity-60"></div>
                </div>

                <div className="p-8 relative">
                  <div
                    className="h-1 rounded-full mb-6 transition-all duration-500 w-12 group-hover:w-24"
                    style={{ background: feature.accentVar }}
                  />

                  <h3 className="text-2xl font-bold mb-3 text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
