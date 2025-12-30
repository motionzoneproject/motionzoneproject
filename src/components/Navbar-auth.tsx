"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session-provider";

export default function NavBarAuth() {
  const { session, user } = useSession();
  const router = useRouter();

  if (session && user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/user"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {user.name}
        </Link>
        {user.role === "admin" && (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">Admin</Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/");
                  router.refresh();
                },
              },
            });
          }}
        >
          Logga ut
        </Button>
      </div>
    );
  }

  return (
    <Button
      asChild
      size="sm"
      className="bg-brand hover:bg-brand-light text-white"
    >
      <Link href="/signin">Logga in</Link>
    </Button>
  );
}
