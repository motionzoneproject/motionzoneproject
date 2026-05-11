"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Style } from "@/generated/prisma/client";
import { pick } from "@/lib/i18n/pick";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

interface DansStilarProps {
  styles: Style[];
}

const DansStilar = ({ styles }: DansStilarProps) => {
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const danceStyles = styles.filter((style) => style.active);

  if (danceStyles.length === 0) return null;

  return (
    <section
      className="py-10 relative overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl md:text-5xl font-black mb-8 text-center text-foreground tracking-tight">
          {t("about.stylesTitle")}
        </h2>

        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4">
          {danceStyles.map((style) => {
            const styleName = pick(style, "name", lang) as string;
            const styleDescription = pick(style, "description", lang) as string;
            return (
              <Dialog key={style.id}>
                <DialogTrigger>
                  <div className="w-[180px] cursor-pointer rounded-xl border border-border p-3 text-center text-lg font-semibold text-foreground transition-colors hover:border-brand/50">
                    {style.imageUrl && (
                      <Image
                        src={style.imageUrl}
                        alt={styleName}
                        height={150}
                        width={150}
                        className="w-50 h-50 rounded-lg object-cover mt-2"
                      />
                    )}
                    <h3>{styleName}</h3>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-h-[90dvh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>{styleName}</DialogTitle>
                    <DialogDescription className="text-base mt-2 whitespace-pre-wrap">
                      {styleDescription}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DansStilar;
