"use client";

import Image from "next/image";

export default function NavBar() {
  return (
    <nav className="bg-purple-900 text-white p-3 flex justify-between w-full">
      <div className="flex">
        <Image src="/LogoGirl.png" width="80" height="80" alt="logo"></Image>
        <Image src="/LOGO.png" width="200" height="50" alt="logo"></Image>
      </div>
    </nav>
  );
}
