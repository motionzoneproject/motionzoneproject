import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/generated/prisma/client";
import type { ProdCourse } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";

interface Props {
  product: Product;
}

export default async function ProductItem({ product }: Props) {
  const prodCourse: ProdCourse[] = await prisma.productOnCourse.findMany({
    where: { productId: product.id },
    include: { course: true },
  });

  //   const terminer = await prisma.termin.findMany({
  //     where: { schemaItems: { some: { courseId: course.id } } },
  //   });

  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{product.name}</div>
            </CardTitle>

            <div className="p-2 flex gap-2">
              {/* <EditProductForm product={product} />
              <DeleteProductBtn productId={product.id} /> */}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Kurser i produkten</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent>
                    <div className="w-full bg-secondary p-2 border-2 rounded max-h-[80vh] overflow-auto">
                      {prodCourse.map((pc) => (
                        <div key={pc.courseId}>
                          {getCourseName(pc.course)} - tillfällen:{" "}
                          {pc.lessonsIncluded}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
