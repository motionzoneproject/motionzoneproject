import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Course } from "@/generated/prisma/client";

interface Props {
  course: Course;
}

export default async function CourseItem({ course }: Props) {
  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{course.name}</div>
            </CardTitle>
            <CardDescription>Teacher: {course.teacherId}</CardDescription>

            <div className="p-2 flex gap-2">
              <Button variant={"default"}>Ändra</Button>
              {/* <DeleteTerminBtn terminId={termin.id} /> */}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          Saker vi vill göra med en kurs!
          <br />
        </CardContent>
      </Card>
    </div>
  );
}
