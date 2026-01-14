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
import CreateCourseProductForm from "./components/CreateCourseProductForm";
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
  const teachers = await prisma.user.findMany({ where: { role: "admin" } });
  const courseName = getCourseName(course);

  const counts = await countOrderItemsAndProductsCourse(course.id);

  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{courseName}</div>
            </CardTitle>

            <div className="p-2 flex gap-2">
              <EditCourseForm teachers={teachers} course={course} />
              <DeleteCourseBtn courseId={course.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="p-2 space-y-2 bg-muted/30 border border-border rounded">
            <div>
              <span className="font-bold">Antal köp med tillgång:</span>{" "}
              {counts.purchaseItemCount ?? 0}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-bold">Produkter:</span>{" "}
                {counts.countProd ?? 0} st
              </div>
              <CreateCourseProductForm
                courseId={course.id}
                courseName={courseName}
              />
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
