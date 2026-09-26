"use client";

import { ClipboardX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { removeBookingsWithoutAttendance } from "@/lib/actions/attendance-actions";

/**
 * Hur bokningarna på en lektion stämmer mot närvaron.
 *
 * Närvaron rör aldrig bokningarna av sig själv. Här ser studion i stället
 * vilka bokningar som saknar närvaro, och kan ta bort dem i ett svep — då
 * läggs tillfällena tillbaka, precis som med papperskorgen.
 */
export function BookingAttendanceTools({
  lessonId,
  taken,
  missing,
  total,
}: {
  lessonId: string;
  /** Närvaron är tagen på lektionen. */
  taken: boolean;
  /** Bokningar där eleven inte markerats som närvarande. */
  missing: number;
  total: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (total === 0) return null;

  if (!taken) {
    return (
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Närvaron är inte tagen på lektionen ännu.
      </p>
    );
  }

  if (missing === 0) {
    return (
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Alla bokningar har närvaro.
      </p>
    );
  }

  const remove = async () => {
    setBusy(true);
    try {
      const res = await removeBookingsWithoutAttendance(lessonId);
      if (res.success) {
        toast.success(res.msg);
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const noun = missing === 1 ? "bokning" : "bokningar";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <span>
        {missing} av {total} {total === 1 ? "bokning" : "bokningar"} saknar
        närvaro.
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={busy}>
            <ClipboardX className="h-4 w-4" />
            Ta bort bokningar utan närvaro
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ta bort {missing} {noun} utan närvaro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bokningar där eleven inte är markerad som närvarande tas bort, och
              tillfällena läggs tillbaka på elevernas saldon. Närvaron står kvar
              som den är.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
