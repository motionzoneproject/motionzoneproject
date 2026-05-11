"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { StartPageContent } from "@/generated/prisma/client";
import { pick } from "@/lib/i18n/pick";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

type HeroProps = {
  content: StartPageContent;
};

export default function Hero({ content }: HeroProps) {
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);

  return (
    <section
      className="relative w-full h-[550px] md:h-[650px] flex items-center overflow-hidden bg-black pt-20"
      role="img"
      aria-label={t("home.heroAriaLabel")}
    >
      <div className="absolute inset-0 z-0">
        <div
          className="absolute bg-top inset-0 bg-cover bg-no-repeat scale-105"
          style={{
            backgroundImage: `url('${content.heroImage}')`,
            animation: "subtlePan 20s ease-in-out infinite alternate",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6 animate-fade-in-left">
            <span className="h-[2px] w-8 bg-brand" />
            <p className="text-brand-secondary font-semibold tracking-[0.2em] uppercase text-lg">
              {pick(content, "heroLabel", lang)}
            </p>
          </div>

          <h1 className="text-5xl md:text-7xl font-light text-white leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:200ms]">
            {pick(content, "heroTitleLine1", lang)}
            <span className="font-serif italic text-brand-light">
              {pick(content, "heroTitleAccent", lang)}
            </span>
            <br />
            <span className="text-3xl md:text-5xl opacity-90">
              {pick(content, "heroTitleLine2", lang)}
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-lg mb-10 font-light animate-fade-in-left [animation-delay:400ms]">
            {pick(content, "heroSubtext", lang)}
          </p>

          <div className="flex flex-wrap gap-5 items-center animate-fade-in-left [animation-delay:600ms]">
            <Button asChild variant="cta">
              <Link href="/courses">{t("home.heroCtaCourses")}</Link>
            </Button>

            <Link
              href="/about"
              className="group flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white/80 font-medium text-sm hover:text-white hover:border-brand transition-all duration-300"
            >
              <ArrowRight className="w-3 h-3" />
              {t("home.heroCtaAbout")}
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black to-transparent" />
    </section>
  );
}
