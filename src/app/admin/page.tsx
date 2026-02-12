import prisma from "@/lib/prisma";
import { LessonCarousel } from "./components/LessonCarousel";

export default async function Page() {
  const now = new Date();

  // Find the current or next term
  const currentTerm = await prisma.termin.findFirst({
    where: {
      endDate: {
        gte: now,
      },
    },
    orderBy: {
      startDate: "asc",
    },
  });

  if (!currentTerm) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Profilsida</h1>
        <div>Ingen aktiv termin hittades.</div>
      </div>
    );
  }

  // Fetch all lessons for the term
  const lessons = await prisma.lesson.findMany({
    where: {
      terminId: currentTerm.id,
    },
    include: {
      course: true,
      teacher: true,
      bookings: true,
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
            Senaste och kommande tillfällen
          </h2>
          <span className="text-sm text-muted-foreground">
            Termin: {currentTerm.name}
          </span>
        </div>

        <div className="bg-muted/30 p-1 rounded-xl">
          <LessonCarousel
            lessons={lessons}
            initialScrollIndex={initialScrollIndex}
          />
        </div>

        <p className="text-sm text-muted-foreground px-2">
          Listar alla kurser i pågående termin, centrerad på det närmaste
          tillfället.
        </p>
      </div>
    </div>
  );
}
