"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { autobook } from "@/lib/actions/server-actions";

export function AutobookBtn({
  purchaseItemId,
  remainingClips,
  disabled,
}: {
  purchaseItemId: string;
  remainingClips: number;
  disabled: boolean;
}) {
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
    <Button
      type="button"
      variant="default"
      size="sm"
      className="gap-2 p-3 bg-brand/10 text-brand border-2 text-xl border-brand/20 hover:bg-brand/20"
      onClick={onAutobook}
      disabled={isPending || remainingClips === 0 || disabled}
    >
      {isPending ? t("user.autobook.running") : t("user.autobook.label")}
    </Button>
  );
}
