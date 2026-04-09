import { redirect } from "next/navigation";
import { PaginationBar } from "@/components/PaginationBar";
import { SearchInput } from "@/components/SearchInput";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdminRole } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import AddProductForm from "./components/AddProductForm";
import ProductItem from "./components/ProductItem";
import ShowInactiveCheckbox from "./components/ShowInactiveCheckbox";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; showInactive?: string }>;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) {
    redirect("/");
  }

  const params = await searchParams;
  const query = params.q || "";
  const showInactive = params.showInactive === "yes";

  // Build filter
  const where = {
    ...(showInactive ? {} : { active: true }),
    ...(query
      ? {
          name: {
            contains: query,
            mode: "insensitive" as const,
          },
        }
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produkter</h1>
          <p className="text-muted-foreground">
            Hantera dina produkter och paket.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShowInactiveCheckbox />
          <SearchInput placeholder="Sök produkter..." />
          <AddProductForm />
        </div>
      </div>

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
              <ProductItem product={p} key={p.id} />
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
