import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { PaginationBar } from "@/components/PaginationBar";
import { SearchInput } from "@/components/SearchInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUsersForAdmin } from "@/lib/actions/accounts";
import { isAdminRole } from "@/lib/actions/admin";
import { getSessionData } from "@/lib/actions/sessiondata";
import { SetRoleButton } from "./SetRoleButton";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AccountsPage({ searchParams }: PageProps) {
  noStore();
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound();

  const resolved = await searchParams;
  const query = typeof resolved.q === "string" ? resolved.q : "";
  const page = Math.max(1, Number.parseInt(resolved.page ?? "1", 10) || 1);

  const sessionData = await getSessionData();
  const currentUserId = sessionData?.user.id;

  const { users, total, totalPages } = await getUsersForAdmin({
    query,
    page,
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Konton</h1>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? "konto" : "konton"} totalt
          </p>
        </div>

        <SearchInput
          placeholder="Sök namn eller e-post..."
          className="w-full sm:w-72"
          paramName="q"
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead className="hidden md:table-cell">Skapad</TableHead>
              <TableHead className="text-right">Roll</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-12"
                >
                  Inga konton hittades.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {user.createdAt.toLocaleDateString("sv-SE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <SetRoleButton
                      userId={user.id}
                      currentRole={user.role}
                      isSelf={user.id === currentUserId}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar currentPage={page} totalPages={totalPages} />
    </div>
  );
}
