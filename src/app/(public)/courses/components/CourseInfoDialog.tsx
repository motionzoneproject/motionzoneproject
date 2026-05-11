"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getCourseName } from "@/lib/tools";

type CourseForDialog = {
  name: string;
  minAge: number | null;
  maxAge: number | null;
  level: string | null;
  description: string;
  adult: boolean;
  teacher: {
    name: string;
    email: string;
    teacherProfile: {
      description: string;
      imageUrl: string | null;
    } | null;
  };
};

interface CourseInfoDialogProps {
  course: CourseForDialog;
}

export function CourseInfoDialog({ course }: CourseInfoDialogProps) {
  const id = useId();
  const title = getCourseName(course);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="flex shrink-0 gap-1 items-center whitespace-nowrap text-xs text-brand hover:underline cursor-pointer">
          Läs mer om kursen
          <ArrowUpRight className="w-3 h-3 shrink-0" />
        </span>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{course.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Target group */}
          <div className="space-y-1">
            <p className="font-medium text-foreground">Målgrupp</p>
            <p className="text-muted-foreground">
              {course.adult ? "Vuxna" : "Barn/Ungdom"}
            </p>
            {course.minAge != null && (
              <p className="text-muted-foreground">
                Åldersgrupp: {course.minAge}
                {course.maxAge != null && course.maxAge > 0
                  ? `–${course.maxAge}`
                  : "+"}{" "}
                år
              </p>
            )}
          </div>

          <Separator />

          {/* Teacher section */}
          <div className="space-y-2">
            <p className="font-medium text-foreground">Lärare</p>
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
                    {course.teacher.teacherProfile.description}
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
