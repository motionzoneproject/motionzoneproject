import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { isAdminRole } from "@/lib/actions/admin";
import { getUsers } from "@/lib/actions/user-management";
import UsersView from "./UsersView";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  noStore();
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound();

  const params = await searchParams;
  const query = params?.q ?? "";
  const page = Math.max(1, Number(params?.page) || 1);

  const { users, total } = await getUsers(query, page, PAGE_SIZE);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Användare</h1>
      <UsersView
        users={JSON.parse(JSON.stringify(users))}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
      />
    </div>
  );
}
