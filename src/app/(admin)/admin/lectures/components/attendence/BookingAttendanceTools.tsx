"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addUserInLesson } from "@/lib/actions/admin";
import type { PresentWithoutBooking } from "@/lib/actions/attendance-actions";

const box = "rounded-md border px-3 py-2 text-sm";
const neutral = `${box} bg-muted/30 text-muted-foreground`;
const warn = `${box} border-amber-500/40 bg-amber-500/10`;

/**
 * Hur bokningarna på en lektion stämmer mot närvaron, åt båda hållen.
 *
 * Närvaron rör aldrig bokningarna. Här ser studion i stället hur många
 * bokningar som saknar närvaro, och vilka som var där utan att ha bokat, så
 * de kan bokas in i efterhand.
 *
 * Bokningar utan närvaro tas inte bort härifrån: en missad lektion ger inte
 * tillbaka något tillfälle, och om den kan tas igen avgör studion med kunden.
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

  return (
    <div className="space-y-2">
      {total > 0 &&
        (missing === 0 ? (
          <p className={neutral}>Alla bokningar har närvaro.</p>
        ) : (
          <p className={warn}>
            {missing} av {total} {total === 1 ? "bokning" : "bokningar"} saknar
            närvaro.
          </p>
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
