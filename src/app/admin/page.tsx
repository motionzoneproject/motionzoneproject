import type { Prisma } from "@/generated/prisma/client";
import { getSessionData } from "@/lib/actions/sessiondata";
import prisma from "@/lib/prisma";
import { LessonCarousel } from "./components/LessonCarousel";

const lessonsInclude = {
  bookings: true,
  teacher: true,
  course: true,
  schemaItem: true,
} satisfies Prisma.LessonInclude;

export type LessonWithData = Prisma.LessonGetPayload<{
  include: typeof lessonsInclude;
}>;

export default async function Page() {
  const sessionData = await getSessionData();
  const user = sessionData?.user;
  if (!sessionData || !user || user.role !== "admin") {
    return null;
  }

  const now = new Date();

  // Fetch all lessons for the user:
  const lessons: LessonWithData[] = await prisma.lesson.findMany({
    where: {
      teacherId: user.id,
      startTime: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // En vecka bakåt
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // En vecka framåt
      },
    },
    include: {
      course: true,
      teacher: true,
      bookings: true,
      schemaItem: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  // Calculate the index of the first future lesson to scroll to
  // If all are past, scroll to the last one. If all are future, scroll to the first (0).
  const futureLessonIndex = lessons.findIndex(
    (l) => new Date(l.endTime) >= now,
  );

  // If futureLessonIndex is -1 (not found), it means all are in the past.
  // We might want to show the last few. Let's default to the last one if all are past.
  // If there are no lessons, it's 0.
  const initialScrollIndex =
    futureLessonIndex === -1 && lessons.length > 0
      ? lessons.length - 1
      : futureLessonIndex === -1
        ? 0
        : futureLessonIndex;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profilsida</h1>
        <p className="text-muted-foreground">Välkommen till adminsidan.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-baseline">
          <h2 className="text-xl font-semibold">
            Dina senaste och kommande lektioner
          </h2>
        </div>

        <div className="bg-muted/30 p-1 rounded-xl">
          <LessonCarousel
            lessons={lessons}
            initialScrollIndex={initialScrollIndex}
          />
        </div>
      </div>
    </div>
  );
}
