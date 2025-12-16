import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Product } from "@/generated/prisma/client";
import type { ProdCourse } from "@/lib/actions/admin";

interface Props {
  product: Product;
  prodCourses: ProdCourse[];
}

export default function ProdCourseBrowser({ product, prodCourses }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="md:flex gap-2 w-full">
          <div>Info om köp? Max antal köp?</div>
        </div>
        <br />

        <div className="w-full bg-secondary p-2 border-2 rounded grid md:grid-cols-2 gap-2 max-h-[80vh] overflow-auto">
          {prodCourses.map((pc) => (
            <div key={pc.courseId}>
              {pc.course.name} - tillfällen: {pc.lessonsIncluded}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
}
