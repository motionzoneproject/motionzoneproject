"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setUserAdminRole } from "@/lib/actions/accounts";

interface SetRoleButtonProps {
  userId: string;
  currentRole: string | null;
  /** Prevent the current user from modifying their own role */
  isSelf: boolean;
}

export function SetRoleButton({
  userId,
  currentRole,
  isSelf,
}: SetRoleButtonProps) {
  const [pending, setPending] = useState(false);
  const isAdmin = currentRole === "admin";

  async function handleSetRole(makeAdmin: boolean) {
    if (makeAdmin === isAdmin) return;
    setPending(true);
    try {
      await setUserAdminRole(userId, makeAdmin);
      toast.success(
        makeAdmin ? "Användaren är nu admin." : "Admin-rollen borttagen.",
      );
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setPending(false);
    }
  }

  if (isSelf) {
    return (
      <Button
        variant="default"
        size="sm"
        disabled
        className="min-w-25 cursor-default"
      >
        {"Ditt Konto"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="min-w-25"
        >
          {isAdmin ? "Admin" : "Användare"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={isAdmin}
          onSelect={() => handleSetRole(true)}
        >
          Gör till admin
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!isAdmin}
          onSelect={() => handleSetRole(false)}
        >
          Ta bort admin
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
