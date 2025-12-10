"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { BetterAuthSession } from "@/lib/auth-session";

export default function NavBarSession({ session }: BetterAuthSession) {
  const router = useRouter();
  return (
    <nav className="bg-purple-900 text-white p-3 flex justify-between w-full">
      <div className="flex">
        <Image src="/LogoGirl.png" width="80" height="80" alt="logo"></Image>
        <Image src="/LOGO.png" width="200" height="50" alt="logo"></Image>
      </div>
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
    </nav>
  );
}
