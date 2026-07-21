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
import type { Studio } from "@/generated/prisma/client";
import { pick } from "@/lib/i18n/pick";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

interface StudioInfoDialogProps {
  studio: Studio;
}

export function StudioInfoDialog({ studio }: StudioInfoDialogProps) {
  const id = useId();
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const studioName = pick(studio, "name", lang) as string;
  const studioDescription = pick(studio, "description", lang) as string;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-brand hover:underline"
        >
          {t("coursesPage.dialog.studioOpenLink")}
          <ArrowUpRight className="w-3 h-3 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{studioName}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            <span
              className="prose dark:prose-invert max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: TipTap content sanitized through DOMPurify on the line above
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(studioDescription),
              }}
            />
          </DialogDescription>
        </DialogHeader>

        {studio.imageUrl && (
          <div className="relative overflow-hidden rounded-xl border border-border aspect-[4/3]">
            <Image
              src={studio.imageUrl}
              alt={studioName}
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
