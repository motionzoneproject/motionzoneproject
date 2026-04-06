import type { Prisma } from "@/generated/prisma/client";
import { getSessionData } from "@/lib/actions/sessiondata";
import prisma from "@/lib/prisma";
import { LessonCarousel } from "./components/LessonCarousel";
import { StatsPage } from "./components/StatsPage";

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

  const lessons: LessonWithData[] = await prisma.lesson.findMany({
    where: {
      teacherId: user.id,
      startTime: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

  const futureLessonIndex = lessons.findIndex(
    (l) => new Date(l.endTime) >= now,
  );

  const initialScrollIndex =
    futureLessonIndex === -1 && lessons.length > 0
      ? lessons.length - 1
      : futureLessonIndex === -1
        ? 0
        : futureLessonIndex;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Översikt admin</h1>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-baseline">
          <h2 className="text-xl font-semibold">
            <strong>Dina</strong> senaste och kommande lektioner
          </h2>
        </div>

        <div className="bg-muted/30 p-1 rounded-xl">
          <LessonCarousel
            lessons={lessons}
            initialScrollIndex={initialScrollIndex}
          />
        </div>
      </div>

      <StatsPage />
    </div>
  );
}
