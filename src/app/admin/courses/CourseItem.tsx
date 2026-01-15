import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Course, User } from "@/generated/prisma/client";
import { countOrderItemsAndProductsCourse } from "@/lib/actions/admin";
import { getCourseName } from "@/lib/tools";
import CreateCourseProductForm from "./components/CreateCourseProductForm";
import DeleteCourseBtn from "./components/DelCourseBtn";
import LessonBrowserData from "./components/LessonBrowserData";
import EditCourseForm from "./forms/EditCourseForm";

interface Props {
  course: Course;
  teachers: User[];
}

// Saker vi vill göra med en kurs! - Lägga till / ta bort kurs - Ändra
//           kursdetaljer. Hantera data kring tillfällen dvs redigera närvaro,
//           ställa in -och skicka meddelande, se antal bokningar / platser.

export default async function CourseItem({ course, teachers }: Props) {
  const courseName = getCourseName(course);

  const counts = await countOrderItemsAndProductsCourse(course.id);

  return (
    <>
      <TableRow className="border-t hover:bg-muted/30">
        <TableCell className="p-3">
          <div className="font-semibold">{courseName}</div>
          <div className="text-xs text-muted-foreground">
            Max / lektion:{" "}
            {course.maxBookings > 0 ? course.maxBookings : "Obegränsat"}
          </div>
        </TableCell>
        <TableCell className="p-3">{counts.purchaseItemCount ?? 0}</TableCell>
        <TableCell className="p-3">
          <div className="flex items-center gap-2">
            <span>{counts.countProd ?? 0} st</span>
            <CreateCourseProductForm
              courseId={course.id}
              courseName={courseName}
            />
          </div>
        </TableCell>
        <TableCell className="p-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                Lektioner
              </Button>
            </DialogTrigger>
            <DialogContent className="overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Lektioner – {courseName}</DialogTitle>
              </DialogHeader>
              <LessonBrowserData courseId={course.id} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Klar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TableCell>
        <TableCell className="p-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <EditCourseForm teachers={teachers} course={course} />
            <DeleteCourseBtn courseId={course.id} />
          </div>
        </TableCell>
      </TableRow>
      <TableRow aria-hidden="true">
        <TableCell colSpan={5} className="h-2 p-0" />
      </TableRow>
    </>
  );
}
