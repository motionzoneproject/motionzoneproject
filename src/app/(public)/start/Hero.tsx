"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { StartPageContent } from "@/generated/prisma/client";

type HeroProps = {
  content: StartPageContent;
};

export default function Hero({ content }: HeroProps) {
  return (
    <section
      className="relative w-full h-[550px] md:h-[650px] flex items-center overflow-hidden bg-black pt-20"
      role="img"
      aria-label="Dansare i studio"
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
              {content.heroLabel}
            </p>
          </div>

          <h1 className="text-5xl md:text-7xl font-light text-white leading-[1.1] tracking-tight mb-6 animate-fade-in-left [animation-delay:200ms]">
            {content.heroTitleLine1}
            <span className="font-serif italic text-brand-light">
              {content.heroTitleAccent}
            </span>
            <br />
            <span className="text-3xl md:text-5xl opacity-90">
              {content.heroTitleLine2}
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-lg mb-10 font-light animate-fade-in-left [animation-delay:400ms]">
            {content.heroSubtext}
          </p>

          <div className="flex flex-wrap gap-5 items-center animate-fade-in-left [animation-delay:600ms]">
            <Button asChild variant="cta">
              <Link href="/courses">Se Våra Kurser</Link>
            </Button>

            <Link
              href="/about"
              className="group flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white/80 font-medium text-sm hover:text-white hover:border-brand transition-all duration-300"
            >
              <ArrowRight className="w-3 h-3" />
              Om Oss
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black to-transparent" />
    </section>
  );
}
