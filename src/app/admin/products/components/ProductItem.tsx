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
import ProdCourseBrowser from "./ProdCourseBrowser";

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
                <ProdCourseBrowser product={product} prodCourses={prodCourse} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
