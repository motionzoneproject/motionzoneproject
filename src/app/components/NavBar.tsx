"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function NavBar() {
  const router = useRouter();
  return (
    <nav className="bg-purple-900 text-white p-3 flex justify-between w-full">
      <div className="flex">
        <Image src="/LogoGirl.png" width="80" height="80" alt="logo"></Image>
        <Image src="/LOGO.png" width="200" height="50" alt="logo"></Image>
      </div>
    </nav>
  );
}
