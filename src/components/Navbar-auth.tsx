"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import type { BetterAuthSession } from "@/lib/auth-session";

// fix: So i will create a navbar based on the Navbar.tsx, and seperate this loginstuff to components.

export default function NavBarAuth({ session }: BetterAuthSession) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2 ml-auto">
      {session ? (
        <>
          <span className="font-mono">logged in: {session.user.name}</span>
          <Button
            className="ml-auto höver:bg-blue-200 hover:text-white"
            variant="destructive"
            onClick={() => {
              authClient.signOut();
              router.push("/");
              router.refresh();
            }}
          >
            Logout
          </Button>
          {session.user.role && session.user.role === "admin" && (
            <Link href="/admin" className="hover:text-cyan-400">
              <Button
                className="ml-auto höver:bg-blue-200 hover:text-white"
                variant="outline"
              >
                Admin
              </Button>
            </Link>
          )}
        </>
      ) : (
        <>
          <Button
            asChild
            className="px-2 py-2 bg-orange-700 rounded-sm hover:bg-amber-400 hover:text-black"
          >
            <Link href={"/signup"}> Sign Up </Link>
          </Button>
          <Button
            asChild
            className="px-2 py-2 bg-sky-700 rounded-sm hover:bg-amber-400 hover:text-black"
          >
            <Link href={"/signin"}> Sign In </Link>
          </Button>
        </>
      )}
    </div>
  );
}
