import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TableCell, TableRow } from "@/components/ui/table";
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

  // Behovsdata för "sålda/max" och för att kunna markera fullbokad produkt.
  const purchasesCount = await prisma.purchase.count({
    where: { productId: product.id },
  });

  // Kopplade kurser visas i accordion + används i "Ändra kurser".
  const prodCourse = await prisma.productOnCourse.findMany({
    where: { productId: product.id },
    include: { course: true },
  });

  const typeLabel = isClip ? "Klippkort" : isPack ? "Paket" : "Kurs";
  // Respektera unlimited-flaggan när vi avgör "fullt".
  const isFull =
    !product.unlimitedCustomers &&
    product.maxCustomer > 0 &&
    purchasesCount >= product.maxCustomer;

  return (
    <>
      <TableRow className="border-t hover:bg-muted/30">
        <TableCell className="p-3">
          <div className="h-12 w-12 rounded border border-border bg-muted flex items-center justify-center overflow-hidden">
            {product.imageURL ? (
              <Image
                src={product.imageURL}
                alt={product.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Ingen bild
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="p-3">
          <div className="font-semibold">{product.name}</div>
          <div className="text-xs text-muted-foreground">
            Sålda / max: {purchasesCount} /{" "}
            {product.unlimitedCustomers ? "Obegränsat" : product.maxCustomer}
            {isFull && <span className="ml-2 text-destructive">Fullt</span>}
          </div>
        </TableCell>
        <TableCell className="p-3">{typeLabel}</TableCell>
        <TableCell className="p-3">{product.price} kr</TableCell>
        <TableCell className="p-3">
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <div className="flex items-center justify-between gap-2">
                <AccordionTrigger className="flex-1">
                  Kurser ({prodCourse.length})
                </AccordionTrigger>
                {/* Server-side fetch av kurslista håller UI enkelt här. */}
                <AddCoursesToProductForm
                  allCourses={await getAllCourses()}
                  productId={product.id}
                  productName={product.name}
                  isClip={isClip}
                  productCourses={prodCourse}
                />
              </div>
              <AccordionContent>
                <div className="w-full overflow-hidden rounded-md border border-border bg-muted/20">
                  {prodCourse.map((pc) => (
                    <div
                      key={pc.courseId}
                      className="px-3 py-2 flex items-center justify-between border-t first:border-t-0 border-border"
                    >
                      <div className="text-sm font-medium">
                        {getCourseName(pc.course)}
                      </div>

                      {!isClip ? (
                        <div className="text-xs text-muted-foreground">
                          Tillfällen:{" "}
                          {pc.unlimited ? "obegränsat" : pc.lessonsIncluded}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Klippkort
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TableCell>
        <TableCell className="p-3">
          <div className="flex items-center justify-end gap-1">
            <EditProductForm
              maxCustomers={product.maxCustomer}
              unlimitedCustomers={product.unlimitedCustomers}
              soldCount={purchasesCount}
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
        </TableCell>
      </TableRow>
      <TableRow aria-hidden="true">
        <TableCell colSpan={6} className="h-2 p-0" />
      </TableRow>
    </>
  );
}
