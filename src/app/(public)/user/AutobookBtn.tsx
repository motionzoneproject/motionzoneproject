"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { autobook } from "@/lib/actions/server-actions";

export function AutobookBtn({ purchaseItemId }: { purchaseItemId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onAutobook = () => {
    startTransition(async () => {
      try {
        const created = await autobook(purchaseItemId);
        if (created.length > 0) {
          toast.success(`${created.length} lektioner autobokades.`);
        } else {
          toast.info("Inga nya lektioner att autoboka.");
        }
        router.refresh();
      } catch (_e) {
        toast.error("Kunde inte autoboka lektioner.");
      }
    });
  };

  return (
    <Button type="button" onClick={onAutobook} disabled={isPending}>
      {isPending ? "Autobokar..." : "Autoboka"}
    </Button>
  );
}
