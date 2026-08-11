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
}

export function AddToCartButton({
  productId,
  productName,
  disabled,
  label,
}: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await addToCart({ productId });

      if (result.success) {
        toast.success(`${productName}`, {
          description: "har lagts till i varukorgen",
          icon: <ShoppingBag className="size-4" />,
        });
      } else {
        toast.error("Kunde inte lägga till produkten", {
          description: "Produkten är inte längre tillgänglig.",
        });
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
      {isPending ? "Lägger till..." : label}
    </Button>
  );
}
