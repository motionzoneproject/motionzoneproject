"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface CartIconProps {
  showLabel?: boolean;
  onClick?: () => void;
  count: number;
}

export default function CartIcon({ showLabel, onClick, count }: CartIconProps) {
  const { t } = useTranslation();

  return (
    <Link
      href="/checkout"
      onClick={onClick}
      className="relative flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors"
    >
      <span className="relative">
        <ShoppingCart className="w-7 h-7" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-brand text-white shadow-sm">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      {showLabel && <span>{t("cart.title")}</span>}
    </Link>
  );
}
