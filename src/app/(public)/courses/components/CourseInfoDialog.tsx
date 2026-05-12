"use client";

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
import { Separator } from "@/components/ui/separator";
import { pick } from "@/lib/i18n/pick";
import { getCourseName } from "@/lib/tools";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

type CourseForDialog = {
  name: string;
  name_en?: string | null;
  minAge: number | null;
  maxAge: number | null;
  level: string | null;
  level_en?: string | null;
  description: string;
  description_en?: string | null;
  adult: boolean;
  teacher: {
    name: string;
    email: string;
    teacherProfile: {
      description: string;
      description_en?: string | null;
      imageUrl: string | null;
    } | null;
  };
};

interface CourseInfoDialogProps {
  course: CourseForDialog;
}

export function CourseInfoDialog({ course }: CourseInfoDialogProps) {
  const id = useId();
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const title = getCourseName(course, lang);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="flex shrink-0 gap-1 items-center whitespace-nowrap text-xs text-brand hover:underline cursor-pointer">
          {t("coursesPage.dialog.openLink")}
          <ArrowUpRight className="w-3 h-3 shrink-0" />
        </span>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {pick(course, "description", lang) as string}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Target group */}
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {t("coursesPage.dialog.targetGroup")}
            </p>
            <p className="text-muted-foreground">
              {course.adult
                ? t("coursesPage.dialog.audienceAdult")
                : t("coursesPage.dialog.audienceChild")}
            </p>
            {course.minAge != null && (
              <p className="text-muted-foreground">
                {t("coursesPage.dialog.ageRange", {
                  range: `${course.minAge}${
                    course.maxAge != null && course.maxAge > 0
                      ? `–${course.maxAge}`
                      : "+"
                  }`,
                })}
              </p>
            )}
          </div>

          <Separator />

          {/* Teacher section */}
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              {t("coursesPage.dialog.teacher")}
            </p>
            <div className="flex items-start gap-3">
              {course.teacher.teacherProfile?.imageUrl && (
                <div className="relative shrink-0 w-16 h-20 rounded-md overflow-hidden border border-border">
                  <Image
                    src={course.teacher.teacherProfile.imageUrl}
                    alt={course.teacher.name}
                    fill
                    className="object-cover object-top"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="space-y-1">
                <p>{course.teacher.name}</p>
                <p className="text-xs text-muted-foreground">
                  {course.teacher.email}
                </p>
                {course.teacher.teacherProfile?.description && (
                  <p className="text-muted-foreground whitespace-pre-line mt-1 leading-relaxed">
                    {
                      pick(
                        course.teacher.teacherProfile,
                        "description",
                        lang,
                      ) as string
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
