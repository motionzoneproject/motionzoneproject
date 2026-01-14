import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/generated/prisma/client";
import { getAllCourses } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import AddCoursesToProductForm from "./AddCoursesToProductForm";
import DeleteProductBtn from "./DelProductBtn";
import EditProductForm from "./EditProductForm";

interface Props {
  product: Product;
}

export default async function ProductItem({ product }: Props) {
  const isClip = product.type === "CLIP";
  const isPack = product.type === "PACK";

  const purchasesCount = await prisma.purchase.count({
    where: { productId: product.id },
  });

  const prodCourse = await prisma.productOnCourse.findMany({
    where: { productId: product.id },
    include: { course: true },
  });

  //   const terminer = await prisma.termin.findMany({
  //     where: { schemaItems: { some: { courseId: course.id } } },
  //   });
  const typeLabel = isClip ? "Klippkort" : isPack ? "Paket" : "Kurs";
  const isFull =
    !product.unlimitedCustomers &&
    product.maxCustomer > 0 &&
    purchasesCount >= product.maxCustomer;

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
                isClip={isClip}
                productCourses={prodCourse}
              ></AddCoursesToProductForm>
              <EditProductForm
                maxCustomers={product.maxCustomer}
                unlimitedCustomers={product.unlimitedCustomers}
                imageURL={product.imageURL ?? ""}
                productId={product.id}
                clipCount={product.totalCount ?? 0}
                clipcard={isClip}
                description={product.description}
                name={product.name}
                price={product.price}
              />
              <DeleteProductBtn productId={product.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="p-2 grid grid-cols-2 gap-2 bg-muted/30 border border-border rounded">
            <div>
              <span className="font-bold">Produkt-typ:</span> {typeLabel}
            </div>
            <div>
              <span className="font-bold">
                {isClip ? "Antal klipp:" : "Antal tillfällen (totalt):"}
              </span>{" "}
              {isClip
                ? (product.totalCount ?? 0)
                : prodCourse.reduce((a, b) => a + b.lessonsIncluded, 0)}
            </div>
            <div>
              <span className="font-bold">Antal bokningsbara kurser:</span>{" "}
              {prodCourse.length}
            </div>
            <div>
              <span className="font-bold">Pris:</span>
              {product.price}
              kr
            </div>
            <div>
              <span className="font-bold">Sålda / max köp:</span>{" "}
              {purchasesCount} /{" "}
              {product.unlimitedCustomers || product.maxCustomer <= 0
                ? "Obegränsat"
                : product.maxCustomer}
              {isFull && <span className="ml-2 text-destructive">Fullt</span>}
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
                          className="p-2 border flex justify-between border-border rounded bg-card space-y-2"
                        >
                          <div>
                            <span className="font-bold">
                              {getCourseName(pc.course)}
                            </span>
                          </div>

                          {!isClip ? (
                            <div>
                              {" "}
                              Tillfällen:{" "}
                              {pc.unlimited
                                ? "obegränsat"
                                : `${pc.lessonsIncluded}`}
                            </div>
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
