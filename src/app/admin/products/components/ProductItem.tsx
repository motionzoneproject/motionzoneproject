import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/generated/prisma/client";
import { getAllCourses, type ProdCourse } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import AddCoursesToProductForm from "./AddCoursesToProductForm";
import DeleteProductBtn from "./DelProductBtn";
import EditProductForm from "./EditProductForm";

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
          <div className="w-full flex justify-between md:items-start">
            <CardTitle>
              <div>{product.name}</div>
            </CardTitle>

            <div className="p-2 space-x-1 space-y-1">
              <AddCoursesToProductForm
                allCourses={await getAllCourses()}
                productId={product.id}
                useTotalCount={product.useTotalCount}
                productCourses={prodCourse}
              ></AddCoursesToProductForm>
              <EditProductForm
                productId={product.id}
                clipCount={product.totalCount ?? 0}
                clipcard={product.useTotalCount}
                description={product.description}
                name={product.name}
                price={product.price.toNumber()}
              />
              <DeleteProductBtn productId={product.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="p-2 grid grid-cols-2 gap-2 bg-accent rounded">
            <div>
              <span className="font-bold">Produkt-typ:</span>{" "}
              {product.useTotalCount
                ? "Klippkort"
                : prodCourse.length > 1
                  ? "Paket"
                  : "Kurs"}
            </div>
            <div>
              <span className="font-bold">Antal tillfällen (totalt):</span>{" "}
              {product.useTotalCount
                ? product.totalCount
                : prodCourse.reduce((a, b) => a + b.lessonsIncluded, 0)}
            </div>
            <div>
              <span className="font-bold">Antal bokningsbara kurser:</span>{" "}
              {prodCourse.length}
            </div>
            <div>
              <span className="font-bold">Pris:</span>{" "}
              {product.price.toNumber()}kr
            </div>
            <div>
              <span className="font-bold">Antal kunder:</span> 0st {/*fix:*/}
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Kurser i produkten</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent>
                    <div className="w-full bg-secondary p-2 border-2 rounded max-h-[80vh] space-y-2 overflow-auto">
                      {prodCourse.map((pc) => (
                        <div
                          key={pc.courseId}
                          className="p-2 border-2 flex justify-between border-blue-800 rounded bg-card space-y-2"
                        >
                          <div>
                            <span className="font-bold">
                              {getCourseName(pc.course)}
                            </span>
                          </div>

                          {!product.useTotalCount ? (
                            <div> Tillfällen: {pc.lessonsIncluded}st</div>
                          ) : (
                            <div>(klippkort)</div>
                          )}
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
