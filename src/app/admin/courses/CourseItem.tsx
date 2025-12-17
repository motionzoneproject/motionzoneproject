import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type CourseWithTeacher,
  countOrderItemsAndProductsCourse,
  type LessonWithBookings,
} from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import DeleteCourseBtn from "./components/DelCourseBtn";
import LessonsBrowser from "./components/LessonsBrowser";
import EditCourseForm from "./forms/EditCourseForm";

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

  const counts = await countOrderItemsAndProductsCourse(course.id);

  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{getCourseName(course)}</div>
            </CardTitle>

            <div className="p-2 flex gap-2">
              <EditCourseForm course={course} />
              <DeleteCourseBtn courseId={course.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="p-2 grid grid-cols-2 gap-2 bg-accent rounded">
            <div>
              <span className="font-bold">Kunder:</span> {counts.count ?? 0} /{" "}
              {course.maxCustomer > 0 ? course.maxCustomer : "Obegränsat"}
            </div>

            <div>
              <span className="font-bold">Produkter:</span>{" "}
              {counts.countProd ?? 0} st
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Lektioner</AccordionTrigger>
              <AccordionContent>
                <LessonsBrowser
                  lessonsWithBookings={lessonsWithBooking}
                  terminer={terminer}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
