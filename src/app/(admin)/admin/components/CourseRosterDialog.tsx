"use client";

import { ExternalLink, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type CourseRoster,
  getCourseRoster,
} from "@/lib/actions/roster-actions";
import {
  AddStudentSearch,
  RemoveFromCourseButton,
} from "./CourseRosterControls";

/**
 * "Hantera elever" för en kurs: vem som går den, och att lägga till eller ta
 * bort. Öppnas från kurssidan, lektionens bokningar och närvaron, och visar
 * samma lista som elevlistan filtrerad på kursen — samma regel överallt.
 */
export function CourseRosterDialog({
  courseId,
  trigger,
  onClosed,
}: {
  courseId: string;
  trigger?: ReactNode;
  /** Körs när dialogen stängs, för en vy som själv hämtat listan. */
  onClosed?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roster, setRoster] = useState<CourseRoster | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRoster(await getCourseRoster(courseId));
    setLoading(false);
  }, [courseId]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) load();
    // Antalet på kurssidan och listorna bakom ska spegla ändringarna.
    else {
      router.refresh();
      onClosed?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Hantera elever
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Elever i {roster?.courseName ?? "kursen"}
            {roster ? ` (${roster.students.length})` : ""}
          </DialogTitle>
          <DialogDescription>
            Ta bort en elev som slutat: kommande bokningar tas bort och saldot
            återställs, lektioner som varit står kvar. Lägg till en elev med köp
            så bokas hen in; utan köp läggs hen till för hand.
            <br />
            Listan ligger till grund för närvarolistorna: alla här står med när
            närvaron tas på kursens lektioner, även den som lagts till för hand
            och saknar bokning. Den som tas bort försvinner från kommande
            lektioner.
          </DialogDescription>
        </DialogHeader>

        {loading && !roster ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Hämtar eleverna…
          </div>
        ) : !roster ? (
          <p className="text-sm text-muted-foreground">
            Kursen hittades inte, eller så saknar du behörighet.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="divide-y rounded-md border">
              {roster.students.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  Ingen går kursen ännu.
                </p>
              )}
              {roster.students.map((student) => (
                <div
                  key={student.studentKey}
                  className="flex items-center justify-between gap-3 p-2.5 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{student.name}</span>
                      {student.customerName && (
                        <span className="text-xs text-muted-foreground">
                          kund: {student.customerName}
                        </span>
                      )}
                      {student.addedManually && (
                        <Badge variant="outline">Tillagd manuellt</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {student.products.map((product) => (
                        <Badge
                          key={product}
                          variant="secondary"
                          className="font-normal"
                        >
                          {product}
                        </Badge>
                      ))}
                      <span>
                        {student.bookings}{" "}
                        {student.bookings === 1 ? "bokning" : "bokningar"}
                      </span>
                    </div>
                  </div>
                  <RemoveFromCourseButton
                    courseId={roster.courseId}
                    courseName={roster.courseName}
                    studentKey={student.studentKey}
                    studentName={student.name}
                    addedManually={student.addedManually}
                    onRemoved={load}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Lägg till elev</h4>
              <AddStudentSearch courseId={roster.courseId} onAdded={load} />
            </div>

            <Button asChild variant="link" size="sm" className="h-auto px-0">
              <Link href={`/admin/students?course=${roster.courseId}`}>
                <ExternalLink className="h-4 w-4" />
                Öppna i elevlistan — mailutskick och schema
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
