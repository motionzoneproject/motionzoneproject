import type { Lesson } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import LessonsBrowser from "./LessonsBrowser";

interface Props {
  courseId: string;
}

export default async function LessonBrowserData({ courseId }: Props) {
  // Fixed: inkluderar inte bookings här.
  const lessons: Lesson[] = await prisma.lesson.findMany({
    where: { courseId: courseId },
  });

  const terminer = await prisma.termin.findMany({
    where: { schemaItems: { some: { courseId: courseId } } },
  });

  return <LessonsBrowser lessons={lessons} terminer={terminer} />;
}
