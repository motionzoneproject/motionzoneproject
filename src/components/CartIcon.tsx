"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCart } from "@/lib/actions/cart";

interface CartIconProps {
  showLabel?: boolean;
  onClick?: () => void;
}

export default function CartIcon({ showLabel, onClick }: CartIconProps) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchCount() {
      const cart = await getCart();
      const total = cart.items.reduce((sum, item) => sum + item.qty, 0);
      setCount(total);
    }
    // Fetch cart count on mount and when pathname changes
    if (pathname) fetchCount();

    // Listen for custom cart updates
    const handleCartUpdate = () => fetchCount();
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, [pathname]);

  return (
    <Link
      href="/checkout"
      onClick={onClick}
      className="relative flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors"
    >
      <span className="relative">
        <ShoppingCart className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-brand text-white shadow-sm">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      {showLabel && <span>Varukorg</span>}
    </Link>
  );
}
