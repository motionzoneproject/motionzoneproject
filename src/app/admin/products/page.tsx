import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllProducts, getTermin, isAdminRole } from "@/lib/actions/admin";
import AddProductForm from "./components/AddProductForm";
import ProductFilters from "./components/ProductFilters";
import ProductItem from "./components/ProductItem";
import SearchInputProd from "./components/SearchProducts";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    termin?: string;
    sort?: string;
  }>;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) {
    redirect("/");
  }

  const params = await searchParams;
  const query = params.q || "";
  const typeParam = params.type;
  const terminParam = params.termin;
  const sortParam = params.sort;

  const type =
    typeParam === "COURSE" || typeParam === "PACK" || typeParam === "CLIP"
      ? typeParam
      : undefined;
  const sort =
    sortParam === "name_asc" ||
    sortParam === "name_desc" ||
    sortParam === "price_asc" ||
    sortParam === "price_desc"
      ? sortParam
      : "name_asc";

  const [allProducts, terminer] = await Promise.all([
    getAllProducts({
      query,
      type,
      terminId: terminParam || undefined,
      sort,
    }),
    getTermin(),
  ]);

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
          <SearchInputProd />
          <ProductFilters terminer={terminer} />
          <AddProductForm />
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <Table className="min-w-[900px] text-sm">
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <TableHead className="p-3 text-left">Bild</TableHead>
              <TableHead className="p-3 text-left">Namn</TableHead>
              <TableHead className="p-3 text-left">Typ</TableHead>
              <TableHead className="p-3 text-left">Pris</TableHead>
              <TableHead className="p-3 text-left">Kurser</TableHead>
              <TableHead className="p-3 text-right">Actions</TableHead>
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
    </div>
  );
}
