import { TableCell, TableRow } from "@/components/ui/table";
import type { Product } from "@/generated/prisma/client";
import { getAllCourses, type ProdCourse } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import AddCoursesToProductForm from "./AddCoursesToProductForm";
import DeleteProductBtn from "./DelProductBtn";
import EditProductForm from "./EditProductForm";

interface Props {
  product: Product;
}

export default async function ProductItem({ product }: Props) {
  const allCourses = await getAllCourses();
  const prodCourse: ProdCourse[] = await prisma.productOnCourse.findMany({
    where: { productId: product.id },
    include: { course: true },
  });

  const productTypeLabel =
    product.type === "CLIP"
      ? "Klippkort"
      : prodCourse.length > 1
        ? "Paket"
        : "Kurs";

  const totalLessons =
    product.type === "CLIP"
      ? (product.totalCount ?? 0)
      : prodCourse.reduce((a, b) => a + b.lessonsIncluded, 0);

  return (
    <TableRow>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>{productTypeLabel}</TableCell>
      <TableCell>{product.price} kr</TableCell>
      <TableCell>
        <AddCoursesToProductForm
          count={prodCourse.length}
          allCourses={allCourses}
          productId={product.id}
          isClip={product.type === "CLIP"}
          clipCount={product.totalCount ?? 0}
          productCourses={prodCourse}
        />
      </TableCell>
      <TableCell>{totalLessons}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <EditProductForm
            imageURL={product.imageURL ?? ""}
            unlimitedCustomers={product.unlimitedCustomers ?? false}
            maxCustomers={product.maxCustomer}
            productId={product.id}
            clipCount={product.totalCount ?? 0}
            clipcard={product.type === "CLIP"}
            description={product.description}
            name={product.name}
            price={product.price}
          />
          <DeleteProductBtn productId={product.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}
