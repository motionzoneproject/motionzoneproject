"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  type BookMyCourseResult,
  bookMyCourse,
} from "@/lib/actions/schedule-actions";

const FAILURE_KEYS: Record<
  Extract<BookMyCourseResult, { success: false }>["reason"],
  string
> = {
  unauthorized: "user.autobook.error",
  notSelected: "user.autobook.notSelected",
  nothingToBook: "user.autobook.noNew",
  error: "user.autobook.error",
};

/**
 * Bokar in kunden på kursens alla kommande lektioner.
 *
 * För ett terminskort eller program är det så kunden sätter sitt schema,
 * kurs för kurs. På ett klippkort delar kurserna på samma pott, så där frågar
 * knappen först — en hel kurs kan förbruka hela kortet.
 */
export function AutobookBtn({
  purchaseItemId,
  remainingClips,
  disabled,
  sharedPot = false,
}: {
  purchaseItemId: string;
  remainingClips: number;
  disabled: boolean;
  /** Klippkort: kurserna delar på samma saldo. */
  sharedPot?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onBook = () => {
    startTransition(async () => {
      const res = await bookMyCourse(purchaseItemId);

      if (res.success) {
        toast.success(t("user.autobook.successCount", { count: res.count }));
      } else if (res.reason === "nothingToBook") {
        toast.info(t(FAILURE_KEYS[res.reason]));
      } else {
        toast.error(t(FAILURE_KEYS[res.reason]));
      }

      router.refresh();
    });
  };

  const button = (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="gap-2 p-3 bg-brand/10 text-brand border-2 text-xl border-brand/20 hover:bg-brand/20"
      onClick={sharedPot ? undefined : onBook}
      disabled={isPending || remainingClips === 0 || disabled}
    >
      {isPending ? t("user.autobook.running") : t("user.autobook.label")}
    </Button>
  );

  if (!sharedPot) return button;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("user.autobook.clipTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("user.autobook.clipDesc", {
              count: Number.isFinite(remainingClips) ? remainingClips : 0,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("user.autobook.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onBook}>
            {t("user.autobook.label")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
