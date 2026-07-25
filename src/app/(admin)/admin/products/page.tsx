import { redirect } from "next/navigation";
import { PaginationBar } from "@/components/PaginationBar";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma, ProductType } from "@/generated/prisma/client";
import { isAdminRole } from "@/lib/actions/admin";
import { getCategories } from "@/lib/actions/category-actions";
import prisma from "@/lib/prisma";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
import AddProductForm from "./components/AddProductForm";
import ManageCategoriesDialog from "./components/ManageCategoryDialog";
import ProductFilter from "./components/ProductFilter";
import ProductItem from "./components/ProductItem";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    showInactive?: string;
    type?: string;
    teacher?: string;
    termin?: string;
    course?: string;
    lang?: string;
  }>;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) {
    redirect("/");
  }

  const params = await searchParams;
  const query = params.q || "";
  const showInactive = params.showInactive === "yes";
  const type = params.type as ProductType | undefined;
  const teacher = params.teacher || "";
  const termin = params.termin || "";
  const course = params.course || "";
  const lang: "sv" | "en" = params.lang === "en" ? "en" : "sv";

  const teachers = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { name: "asc" },
  });
  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });
  const courses = await prisma.course.findMany({
    orderBy: { name: "asc" },
  });

  // Build filter
  // Build course-relation conditions (must be combined into one `courses.some`)
  const courseConditions: Prisma.ProductOnCourseWhereInput[] = [];
  if (course) courseConditions.push({ courseId: course });
  if (teacher) courseConditions.push({ course: { teacherId: teacher } });
  if (termin)
    courseConditions.push({
      course: { schemaItems: { some: { terminId: termin } } },
    });

  const where: Prisma.ProductWhereInput = {
    ...(showInactive ? {} : { active: true }),
    ...(query
      ? {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              name_en: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(type ? { type } : {}),
    ...(courseConditions.length > 0
      ? { courses: { some: { AND: courseConditions } } }
      : {}),
  };

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(params.page) || 1;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Get total count for pagination
  const totalProducts = await prisma.product.count({ where });
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  // Fetch paginated products
  const allProducts = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    skip,
    take: ITEMS_PER_PAGE,
  });

  const categories = await getCategories();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-2xl">Produkter</span>
          <div className="space-y-0">
            <div className="mt-3 text-sm w-fit">Formulärspråk:</div>
            <div className="w-fit">
              <AdminLanguageSwitch value={lang ?? "sv"} />
            </div>
          </div>
        </div>
        <ManageCategoriesDialog categories={categories} />
        <AddProductForm categories={categories} />
      </div>
      <ProductFilter
        lang={lang}
        teachers={teachers}
        terminer={terminer}
        courses={courses}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Totalt {totalProducts} produkter</span>
      </div>

      <div className="w-full rounded border">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produkt</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Pris</TableHead>
              <TableHead>Kurser</TableHead>
              <TableHead>Platser</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allProducts.map((p) => (
              <ProductItem product={p} key={p.id} lang={lang} />
            ))}
          </TableBody>
        </Table>
      </div>

      {allProducts.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">Inga produkter hittades.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
