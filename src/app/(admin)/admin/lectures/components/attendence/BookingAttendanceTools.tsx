"use client";

import { ClipboardX, UserPlus } from "lucide-react";
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
import { addUserInLesson } from "@/lib/actions/admin";
import {
  type PresentWithoutBooking,
  removeBookingsWithoutAttendance,
} from "@/lib/actions/attendance-actions";

const box = "rounded-md border px-3 py-2 text-sm";
const neutral = `${box} bg-muted/30 text-muted-foreground`;
const warn = `${box} border-amber-500/40 bg-amber-500/10`;

/**
 * Hur bokningarna på en lektion stämmer mot närvaron, åt båda hållen.
 *
 * Närvaron rör aldrig bokningarna av sig själv. Här ser studion i stället
 * vilka bokningar som saknar närvaro — och kan ta bort dem i ett svep, så
 * läggs tillfällena tillbaka som med papperskorgen — och vilka som var där
 * utan att ha bokat, så de kan bokas in i efterhand.
 */
export function BookingAttendanceTools({
  lessonId,
  taken,
  missing,
  total,
  presentWithoutBooking,
}: {
  lessonId: string;
  /** Närvaron är tagen på lektionen. */
  taken: boolean;
  /** Bokningar där eleven inte markerats som närvarande. */
  missing: number;
  total: number;
  presentWithoutBooking: PresentWithoutBooking[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (!taken) {
    return total > 0 ? (
      <p className={neutral}>Närvaron är inte tagen på lektionen ännu.</p>
    ) : null;
  }

  const run = async (
    key: string,
    action: () => Promise<{ success: boolean; msg: string }>,
  ) => {
    setBusy(key);
    try {
      const res = await action();
      if (res.success) {
        toast.success(res.msg);
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const noun = missing === 1 ? "bokning" : "bokningar";

  return (
    <div className="space-y-2">
      {total > 0 &&
        (missing === 0 ? (
          <p className={neutral}>Alla bokningar har närvaro.</p>
        ) : (
          <div
            className={`${warn} flex flex-wrap items-center justify-between gap-2`}
          >
            <span>
              {missing} av {total} {total === 1 ? "bokning" : "bokningar"}{" "}
              saknar närvaro.
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={busy !== null}
                >
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
                    Bokningar där eleven inte är markerad som närvarande tas
                    bort, och tillfällena läggs tillbaka på elevernas saldon.
                    Närvaron står kvar som den är.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      void run("remove", () =>
                        removeBookingsWithoutAttendance(lessonId),
                      )
                    }
                  >
                    Ta bort
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}

      {presentWithoutBooking.length > 0 && (
        <div className={`${warn} space-y-2`}>
          <p>
            {presentWithoutBooking.length === 1
              ? "1 elev var närvarande utan bokning."
              : `${presentWithoutBooking.length} elever var närvarande utan bokning.`}
          </p>
          <ul className="space-y-1.5">
            {presentWithoutBooking.map((student) => (
              <li
                key={student.studentKey}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="font-medium">{student.name}</span>
                {student.reason === "bookable" &&
                student.purchaseItemId &&
                student.ownerUserId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={busy !== null}
                    onClick={() => {
                      const purchaseItemId = student.purchaseItemId ?? "";
                      const userId = student.ownerUserId ?? "";
                      void run(student.studentKey, () =>
                        addUserInLesson({ lessonId, userId, purchaseItemId }),
                      );
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    {busy === student.studentKey ? "Bokar in…" : "Boka in"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {student.reason === "noBalance"
                      ? "saldot är slut"
                      : "inget köp i kursen"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            "Boka in" drar ett tillfälle från elevens köp, som en vanlig
            bokning.
          </p>
        </div>
      )}
    </div>
  );
}
