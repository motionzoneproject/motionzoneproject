"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { autobook } from "@/lib/actions/server-actions";

export function AutobookBtn({ purchaseItemId }: { purchaseItemId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onAutobook = () => {
    startTransition(async () => {
      try {
        const created = await autobook(purchaseItemId);
        if (created.length > 0) {
          toast.success(
            t("user.autobook.successCount", { count: created.length }),
          );
        } else {
          toast.info(t("user.autobook.noNew"));
        }
        router.refresh();
      } catch (_e) {
        toast.error(t("user.autobook.error"));
      }
    });
  };

  return (
    <Button type="button" onClick={onAutobook} disabled={isPending}>
      {isPending ? t("user.autobook.running") : t("user.autobook.label")}
    </Button>
  );
}
