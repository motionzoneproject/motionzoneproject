"use client";

import { CalendarRange, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getPurchaseSchedule,
  type PurchaseSchedule,
  setCourseBooking,
} from "@/lib/actions/schedule-actions";
import type { StudentSummary } from "../page";

/**
 * Sätter ihop elevens schema: vilka av köpets kurser hen faktiskt går på.
 *
 * För en vanlig kurs bokas eleven in automatiskt när ordern godkänns, och då
 * står allt redan ibockat här. För terminskort och program ger köpet tillgång
 * till tjugotal kurser som eleven inte ska gå allihop — där är den här vyn
 * verktyget som avgör vilka det blir.
 */
export function ScheduleDialog({ student }: { student: StudentSummary }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<PurchaseSchedule[]>([]);

  const load = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.all(
        student.purchases.map((p) => getPurchaseSchedule(p.id)),
      );
      setSchedules(
        results.filter(
          (r): r is PurchaseSchedule => r !== null && r.rows.length > 0,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) void load();
  };

  const toggle = async (purchaseItemId: string, booked: boolean) => {
    setBusyRow(purchaseItemId);
    try {
      const res = await setCourseBooking(purchaseItemId, booked);
      if (res.success) {
        toast.success(res.msg);
      } else {
        toast.error(res.msg);
      }
      await load();
      router.refresh();
    } finally {
      setBusyRow(null);
    }
  };

  const bookedCourses = schedules
    .flatMap((s) => s.rows)
    .filter((r) => r.bookedUpcoming > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <CalendarRange className="h-4 w-4" />
          Schema
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schema för {student.name}</DialogTitle>
          <DialogDescription>
            Bocka i de kurser eleven ska gå på. Ibockad betyder inbokad på
            kursens kommande lektioner. Att bocka ur tar bara bort kommande
            bokningar — lektioner som redan varit står kvar.
          </DialogDescription>
        </DialogHeader>

        {isLoading && schedules.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Hämtar kurserna...
          </div>
        ) : schedules.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Eleven har inga kursrader att boka på. Saknas ett köp helt kan det
            lagas under Felkontroll.
          </p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div key={schedule.purchaseId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{schedule.productName}</p>
                  {schedule.manualSchedule && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                      Manuellt schema
                    </span>
                  )}
                </div>

                <div className="rounded-lg border divide-y">
                  {schedule.rows.map((row) => {
                    const isBooked = row.bookedUpcoming > 0;
                    const nothingToBook =
                      row.upcomingLessons === 0 && !isBooked;

                    return (
                      <label
                        key={row.purchaseItemId}
                        htmlFor={`course-${row.purchaseItemId}`}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          id={`course-${row.purchaseItemId}`}
                          className="mt-0.5 h-5 w-5"
                          checked={isBooked}
                          disabled={
                            busyRow === row.purchaseItemId ||
                            nothingToBook ||
                            (!isBooked && row.outOfBalance)
                          }
                          onCheckedChange={(checked) =>
                            void toggle(row.purchaseItemId, checked === true)
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm">
                            {row.courseName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {isBooked
                              ? `Bokad på ${row.bookedUpcoming} av ${row.upcomingLessons} kommande lektioner`
                              : nothingToBook
                                ? "Inga kommande lektioner"
                                : `${row.upcomingLessons} kommande lektioner`}
                            {" · "}
                            {row.remaining} kvar
                            {!isBooked && row.outOfBalance
                              ? " (saldot är slut)"
                              : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <p className="text-xs text-muted-foreground">
              {bookedCourses} av{" "}
              {schedules.reduce((sum, s) => sum + s.rows.length, 0)} kurser är
              inbokade.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
