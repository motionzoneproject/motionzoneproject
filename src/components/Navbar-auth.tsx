"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session-provider";

// fix: So i will create a navbar based on the Navbar.tsx, and seperate this loginstuff to components.

export default function NavBarAuth() {
  const { session, user } = useSession();

  const router = useRouter();

  return (
    <div className="flex items-center gap-2 ml-auto">
      {session && user ? (
        <>
          <span className="font-mono">logged in: {user.name}</span>
          <Button
            className="ml-auto höver:bg-blue-200 hover:text-white cursor-pointer"
            variant="destructive"
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
            Logout
          </Button>
          {user && user.role === "admin" ? (
            <Button
              className="ml-auto hover:bg-blue-200 hover:text-white cursor-pointer"
              variant="secondary"
              asChild
            >
              <Link href="/admin">Admin</Link>
            </Button>
          ) : (
            <Button
              className="ml-auto hover:bg-blue-200 hover:text-white cursor-pointer"
              variant="secondary"
              asChild
            >
              <Link href="/user">User</Link>
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            asChild
            className="px-2 py-2 bg-orange-700 rounded-sm hover:bg-amber-400 hover:text-black cursor-pointer"
          >
            <Link href={"/signup"}> Sign Up </Link>
          </Button>
          <Button
            asChild
            className="px-2 py-2 bg-sky-700 rounded-sm hover:bg-amber-400 hover:text-black cursor-pointer"
          >
            <Link href={"/signin"}> Sign In </Link>
          </Button>
        </>
      )}
      <ModeToggle />
    </div>
  );
}
