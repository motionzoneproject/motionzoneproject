import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Course } from "@/generated/prisma/client";
import { countOrderItemsAndProductsCourse } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import DeleteCourseBtn from "./components/DelCourseBtn";
import LessonBrowserData from "./components/LessonBrowserData";
import EditCourseForm from "./forms/EditCourseForm";

interface Props {
  course: Course;
}

// Saker vi vill göra med en kurs! - Lägga till / ta bort kurs - Ändra
//           kursdetaljer. Hantera data kring tillfällen dvs redigera närvaro,
//           ställa in -och skicka meddelande, se antal bokningar / platser.

export default async function CourseItem({ course }: Props) {
  // fix: Vi skickar med alla lärare men vi har inte gjort så admin kan välja lärare för en kurs än.
  const teachers = await prisma.user.findMany({ where: { role: "admin" } });

  // Räknar ut hur många som köpt produkten? Nej, ska utgå från order m.m. Fix!
  const counts = await countOrderItemsAndProductsCourse(course.id); //

  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{getCourseName(course)}</div>
            </CardTitle>

            <div className="p-2 flex gap-2">
              <EditCourseForm teachers={teachers} course={course} />
              <DeleteCourseBtn courseId={course.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="p-2 grid grid-cols-2 gap-2 bg-muted/30 border border-border rounded">
            <div>
              <span className="font-bold">Antal köp med tillgång:</span>{" "}
              {counts.purchaseItemCount ?? 0}
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
                <LessonBrowserData courseId={course.id} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
