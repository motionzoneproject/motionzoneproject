"use client";

import { Loader2, RotateCcw, Search, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addStudentToCourse,
  clearRosterAdjustment,
  getRosterForCourse,
  hideStudentFromCourse,
  type RosterCandidate,
  type RosterView,
  searchStudentsForRoster,
} from "@/lib/actions/roster-actions";

/**
 * Lägger till och tar bort elever i en kurs elevlista.
 *
 * Listan härleds ur köpen, vilket bara stämmer för en vanlig kurs: ett
 * terminskort ger rader i samtliga kurser det gäller, och ett program vars
 * kurser kopplades efter köpet ger inga rader alls. Justeringarna här rör
 * varken köp, saldo, bokningar eller fakturor — bara vilka läraren ser.
 */
export function ManageRosterDialog({
  courseId,
  courseName,
  trigger,
}: {
  courseId: string;
  courseName: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roster, setRoster] = useState<RosterView | null>(null);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<RosterCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      setRoster(await getRosterForCourse(courseId));
    } finally {
      setIsLoading(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) void load();
    else {
      setQuery("");
      setCandidates([]);
    }
  };

  const runSearch = async () => {
    setIsSearching(true);
    try {
      setCandidates(await searchStudentsForRoster(courseId, query));
    } finally {
      setIsSearching(false);
    }
  };

  const run = async (
    key: string,
    action: () => Promise<{ success: boolean; msg: string }>,
  ) => {
    setBusyKey(key);
    try {
      const res = await action();
      if (res.success) toast.success(res.msg);
      else toast.error(res.msg);
      await load();
      if (query.trim().length >= 2) await runSearch();
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Elever i {courseName}</DialogTitle>
          <DialogDescription>
            Listan kommer från kundernas köp. Ändringarna här rör bara vilka som
            syns på lektionen — inga köp, saldon eller fakturor påverkas.
          </DialogDescription>
        </DialogHeader>

        {isLoading && !roster ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Hämtar listan...
          </div>
        ) : !roster ? (
          <p className="py-6 text-sm text-muted-foreground">
            Kunde inte hämta listan.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                I listan ({roster.students.length})
              </p>
              <div className="divide-y rounded-lg border">
                {roster.students.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Ingen elev i listan ännu.
                  </p>
                ) : (
                  roster.students.map((student) => (
                    <div
                      key={student.studentKey}
                      className="flex items-center gap-2 p-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{student.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {student.source === "manual"
                            ? "Tillagd för hand"
                            : `Via köp${student.remaining ? ` · ${student.remaining} kvar` : ""}`}
                          {student.customerName
                            ? ` · kund: ${student.customerName}`
                            : ""}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyKey === student.studentKey}
                        onClick={() =>
                          void run(student.studentKey, () =>
                            student.source === "manual"
                              ? clearRosterAdjustment(
                                  courseId,
                                  student.studentKey,
                                )
                              : hideStudentFromCourse(
                                  courseId,
                                  student.studentKey,
                                ),
                          )
                        }
                      >
                        <UserMinus className="h-4 w-4" />
                        Ta bort
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {roster.hidden.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Borttagna ur listan ({roster.hidden.length})
                </p>
                <div className="divide-y rounded-lg border border-dashed">
                  {roster.hidden.map((entry) => (
                    <div
                      key={entry.studentKey}
                      className="flex items-center gap-2 p-3"
                    >
                      <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                        {entry.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyKey === entry.studentKey}
                        onClick={() =>
                          void run(entry.studentKey, () =>
                            clearRosterAdjustment(courseId, entry.studentKey),
                          )
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                        Ta tillbaka
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Lägg till en elev</p>
              <div className="flex gap-2">
                <Input
                  value={query}
                  placeholder="Sök på namn eller e-post"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runSearch();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void runSearch()}
                  disabled={isSearching || query.trim().length < 2}
                >
                  <Search className="h-4 w-4" />
                  Sök
                </Button>
              </div>

              {candidates.length > 0 && (
                <div className="divide-y rounded-lg border">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.studentKey}
                      className="flex items-center gap-2 p-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{candidate.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {candidate.detail}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyKey === candidate.studentKey}
                        onClick={() =>
                          void run(candidate.studentKey, () =>
                            addStudentToCourse(courseId, candidate.studentKey),
                          )
                        }
                      >
                        <UserPlus className="h-4 w-4" />
                        Lägg till
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                En elev som läggs till här får ingen bokning och inget klipp
                dras. Ska hen boka in sig på kursens lektioner gör du det under
                Elever, i kolumnen Schema.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
