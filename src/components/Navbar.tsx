import Link from "next/link";
import type { BetterAuthSession } from "@/lib/auth-session";
import NavBarAuth from "./Navbar-auth";

export default function NavBar({ session }: BetterAuthSession) {
  return (
    <header className="w-full">
      <nav className="flex items-center justify-between p-4 bg-linear-to-r from-purple-900 to-gray-900 text-white">
        <Link href="/">
          {/* <Image
            loading="eager"
            src="/LogoGP.png"
            width={195}
            height={66}
            alt="MotionZone Växjö"
          /> */}

          <span className="text-xl font-bold">MotionZone Växjö</span>
        </Link>

        <ul className="flex space-x-6 text-sm">
          <li>
            <Link href="/" className="hover:text-cyan-400">
              Hem
            </Link>
          </li>
          <li>
            <Link href="/courses" className="hover:text-cyan-400">
              Kurser
            </Link>
          </li>
          <li>
            <Link href="/gallery" className="hover:text-cyan-400">
              Galleri
            </Link>
          </li>
          <li>
            <Link href="/about" className="hover:text-cyan-400">
              Om oss
            </Link>
          </li>
        </ul>

        <div className="flex items-center space-x-4">
          <span className="text-sm">Svenska 🇸🇪</span>
          <Link href="/checkout" className="hover:text-cyan-400">
            <span className="text-sm">Varukorg 🛒</span>
          </Link>

          <NavBarAuth session={session}></NavBarAuth>
        </div>
      </nav>
    </header>
  );
}
