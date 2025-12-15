import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  CourseWithTeacher,
  LessonWithBookings,
} from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import DeleteCourseBtn from "./components/DelCourseBtn";
import LessonsBrowser from "./components/LessonsBrowser";

interface Props {
  course: CourseWithTeacher;
}

// Saker vi vill göra med en kurs! - Lägga till / ta bort kurs - Ändra
//           kursdetaljer. Hantera data kring tillfällen dvs redigera närvaro,
//           ställa in -och skicka meddelande, se antal bokningar / platser.

export default async function CourseItem({ course }: Props) {
  const lessonsWithBooking: LessonWithBookings[] = await prisma.lesson.findMany(
    {
      where: { courseId: course.id },
      include: { bookings: true },
    },
  );

  const terminer = await prisma.termin.findMany({
    where: { schemaItems: { some: { courseId: course.id } } },
  });

  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{course.name}</div>
            </CardTitle>
            <CardDescription>
              Lärare: {course.teacher.name}
              <br />
              Maxbookings: {course.maxBookings}
            </CardDescription>

            <div className="p-2 flex gap-2">
              <Button variant={"default"}>Ändra</Button>
              <DeleteCourseBtn courseId={course.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <LessonsBrowser
            lessonsWithBookings={lessonsWithBooking}
            terminer={terminer}
          />
        </CardContent>
      </Card>
    </div>
  );
}
