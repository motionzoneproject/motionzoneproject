"use client";

import DOMPurify from "isomorphic-dompurify";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pick } from "@/lib/i18n/pick";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

type StyleForDialog = {
  name: string;
  name_en?: string | null;
  description: string;
  description_en?: string | null;
  imageUrl: string | null;
};

interface StyleInfoDialogProps {
  style: StyleForDialog;
}

export function StyleInfoDialog({ style }: StyleInfoDialogProps) {
  const id = useId();
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const styleName = pick(style, "name", lang) as string;
  const styleDescription = pick(style, "description", lang) as string;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-brand hover:underline"
        >
          {t("coursesPage.dialog.styleOpenLink")}
          <ArrowUpRight className="w-3 h-3 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{styleName}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            <div
              className="prose dark:prose-invert max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: TipTap content sanitized through DOMPurify on the line above
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(styleDescription),
              }}
            />
          </DialogDescription>
        </DialogHeader>

        {style.imageUrl && (
          <div className="relative overflow-hidden rounded-xl border border-border aspect-[4/3]">
            <Image
              src={style.imageUrl}
              alt={styleName}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
