import { EyeOffIcon, MessageCircleWarningIcon } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Product } from "@/generated/prisma/client";
import { getAllCourses, type ProdCourse } from "@/lib/actions/admin";
import { getCategories } from "@/lib/actions/category-actions";
import { getProductStats } from "@/lib/actions/purchase-actions";
import { formatPrice } from "@/lib/money";
import prisma from "@/lib/prisma";
import AddCoursesToProductForm from "./AddCoursesToProductForm";
import DeleteProductBtn from "./DelProductBtn";
import EditProductForm from "./EditProductForm";
import ToggleProductActiveBtn from "./ToggleProductActiveBtn";

interface Props {
  product: Product;
  lang: "sv" | "en";
}

export default async function ProductItem({ product, lang }: Props) {
  const allCourses = await getAllCourses("", true, lang);
  const productStats = await getProductStats(product.id);
  const prodCourse: ProdCourse[] = await prisma.productOnCourse.findMany({
    where: { productId: product.id },
    include: { course: true },
  });

  const categories = await getCategories();

  const productTypeLabel =
    product.type === "CLIP"
      ? "Klippkort"
      : prodCourse.length > 1
        ? "Paket"
        : "Kurs";

  return (
    <TableRow className={!product.active ? "opacity-60" : ""}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {lang === "en" ? product.name_en : product.name}
          {!product.active && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <EyeOffIcon className="h-3 w-3" />
              Inaktiv
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>{productTypeLabel}</TableCell>
      <TableCell>
        {product.autobook ? (
          <span className="text-green-500">Ja</span>
        ) : (
          <span className="text-gray-500">Nej</span>
        )}
        {product.autobook &&
        product.type === "CLIP" &&
        prodCourse.length > 1 ? (
          <span className="bg-amber-300 font-bold text-red-700 ml-2 p-1 rounded">
            <MessageCircleWarningIcon className="inline h-3 w-3" />
            EJ MÖJLIGT
          </span>
        ) : (
          ""
        )}
      </TableCell>

      <TableCell>{product.maxCourses ?? ""}</TableCell>
      <TableCell>{formatPrice(product.price)}</TableCell>
      <TableCell>
        <AddCoursesToProductForm
          initialLang={lang}
          count={prodCourse.length}
          allCourses={allCourses}
          productId={product.id}
          isClip={product.type === "CLIP"}
          clipCount={product.totalCount ?? 0}
          productCourses={prodCourse}
        />
      </TableCell>
      <TableCell>
        {!productStats.success
          ? "Okänd"
          : typeof productStats.spotsLeft === "number" &&
              Number.isFinite(productStats.spotsLeft)
            ? `${productStats.spotsLeft} kvar (${productStats.sold} skapade, ${productStats.reserved} reserverade)`
            : `∞ (${productStats.sold} skapade, ${productStats.reserved} reserverade)`}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <ToggleProductActiveBtn
            productId={product.id}
            productName={product.name}
            active={product.active}
          />
          <EditProductForm
            initialLang={lang}
            categories={categories}
            autobook={product.autobook ?? false}
            maxCourses={product.maxCourses ?? null}
            categoryId={product.categoryId ?? ""}
            imageURL={product.imageURL ?? ""}
            unlimitedCustomers={product.unlimitedCustomers ?? false}
            maxCustomers={product.maxCustomer}
            productId={product.id}
            clipCount={product.totalCount ?? 0}
            clipcard={product.type === "CLIP"}
            description={product.description}
            name={product.name}
            description_en={product.description_en ?? ""}
            name_en={product.name_en ?? ""}
            price={product.price}
          />
          <DeleteProductBtn
            productId={product.id}
            imageURL={product.imageURL}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
