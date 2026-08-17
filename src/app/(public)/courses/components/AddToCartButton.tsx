"use client";

import { ShoppingBag } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/cart";

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  disabled?: boolean;
  label: string;
  lang: "sv" | "en";
}

export function AddToCartButton({
  productId,
  productName,
  disabled,
  label,
  lang = "sv",
}: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await addToCart({
        productId: productId,
        redirectTo: "/checkout",
      });

      if (result.success) {
        toast.success(`${productName}`, {
          description:
            lang === "sv" ? "har lagts till i varukorgen" : "added to cart",
          icon: <ShoppingBag className="size-4" />,
        });
      } else {
        toast.error(
          lang === "sv"
            ? "Kunde inte lägga till produkten"
            : "Could not add product",
          {
            description:
              lang === "sv"
                ? "Produkten är inte längre tillgänglig."
                : "The product is no longer available.",
          },
        );
      }
    });
  }

  return (
    <Button
      type="button"
      disabled={disabled || isPending}
      onClick={handleClick}
      className="w-full bg-brand hover:bg-brand-light text-white font-medium transition-colors duration-200"
    >
      {isPending ? (lang === "sv" ? "Lägger till..." : "Adding...") : label}
    </Button>
  );
}
