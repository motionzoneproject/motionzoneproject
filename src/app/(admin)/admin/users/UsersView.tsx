"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminSetRole, type UserRow } from "@/lib/actions/user-management";
import { calculateAge, formatDateToInputStr } from "@/lib/date-utils";
import { useSession } from "@/lib/session-provider";
import { DetailsDialog } from "../students/components/DetailsDialog";
import StudentUserEditDialog from "../students/components/StudentUserEditDialog";
import BanUserDialog from "./BanUserDialog";

export default function UsersView({
  users,
  total,
  page,
  pageSize,
  query,
}: {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}) {
  const { user: currentUser } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("q", searchValue.trim());
    router.push(`/admin/users?${params.toString()}`);
  }

  function handleRoleChange(userId: string, role: string) {
    startTransition(async () => {
      const result = await adminSetRole(
        userId,
        role as "admin" | "teacher" | "user",
      );
      if (result.success) {
        toast.success("Roll uppdaterad");
        router.refresh();
      } else {
        toast.error("Kunde inte ändra roll", { description: result.error });
      }
    });
  }

  const isSelf = (userId: string) => currentUser?.id === userId;

  return (
    <>
      <form onSubmit={handleSearch} className="relative w-full md:w-80">
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Sök namn eller e-post..."
          className="pr-16"
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
        >
          Sök
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b">
              <th className="p-3 text-left font-medium">Namn</th>
              <th className="p-3 text-left font-medium">Ålder</th>
              <th className="p-3 text-left font-medium">Bild/Video</th>
              <th className="p-3 text-left font-medium">E-post</th>
              <th className="p-3 text-left font-medium hidden md:table-cell">
                Telefon
              </th>
              <th className="p-3 text-left font-medium">Roll</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Alla detaljer</th>
              <th className="p-3 text-left font-medium hidden lg:table-cell">
                Registrerad
              </th>
              <th className="p-3 text-left font-medium">Åtgärder</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-6 text-center text-muted-foreground"
                >
                  Inga användare hittades.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">
                    {u.details?.firstName || u.details?.lastName
                      ? `${u.details.firstName ?? ""} ${u.details.lastName ?? ""}`.trim()
                      : u.name}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.details?.dateOfBirth
                      ? calculateAge(u.details.dateOfBirth)
                      : "—"}
                  </td>
                  <td className="p-3">
                    {u.details?.allowPhotoVideo ? (
                      <Badge variant="default">Ja</Badge>
                    ) : (
                      <Badge variant="destructive">Nej</Badge>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">
                    {u.details?.phoneNumber ?? "—"}
                  </td>
                  <td className="p-3">
                    {isSelf(u.id) ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Select
                        value={
                          u.role === "admin" || u.role === "teacher"
                            ? u.role
                            : "user"
                        }
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                        disabled={isPending}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Användare</SelectItem>
                          <SelectItem value="teacher">Lärare</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="p-3">
                    {u.banned ? (
                      <Badge variant="destructive">Blockerad</Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      >
                        Aktiv
                      </Badge>
                    )}
                  </td>
                  <td>
                    <DetailsDialog id={u.id} isParticipant={false} />
                  </td>
                  <td className="p-3 text-muted-foreground hidden lg:table-cell">
                    {formatDateToInputStr(u.createdAt)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <StudentUserEditDialog user={u} />
                      {!isSelf(u.id) && (
                        <BanUserDialog
                          userId={u.id}
                          userName={u.name}
                          isBanned={!!u.banned}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Visar {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}{" "}
            av {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild disabled={page <= 1}>
              <Link
                href={`/admin/users?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page - 1) }).toString()}`}
                aria-disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Föregående
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={page >= totalPages}
            >
              <Link
                href={`/admin/users?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page + 1) }).toString()}`}
                aria-disabled={page >= totalPages}
              >
                Nästa
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
