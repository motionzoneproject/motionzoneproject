"use client";

import { Loader2, Search, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  type RosterCandidate,
  removeStudentFromCourse,
  searchStudentsForCourse,
} from "@/lib/actions/roster-actions";

/**
 * Lägger till en elev i kursen: söker bland konton och deltagare.
 *
 * Har eleven ett köp som gäller kursen bokas hen in på de kommande
 * lektionerna; annars läggs hen till för hand, utan saldo och utan faktura.
 */
export function AddStudentToCourseDialog({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Lägg till elev i {courseName}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lägg till elev i {courseName}</DialogTitle>
          <DialogDescription>
            Har eleven ett köp som gäller kursen bokas hen in på kursens
            kommande lektioner. Annars läggs hen till för hand, utan saldo och
            utan faktura — till exempel för en provlektion.
          </DialogDescription>
        </DialogHeader>

        <AddStudentSearch
          courseId={courseId}
          onAdded={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sökningen och "Lägg till", utan egen dialog. Används både i dialogen ovan
 * och direkt i "Hantera elever", där en dialog i dialogen vore klumpig.
 */
export function AddStudentSearch({
  courseId,
  onAdded,
}: {
  courseId: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RosterCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, startSearch] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const search = () =>
    startSearch(async () => {
      setResults(await searchStudentsForCourse(courseId, query));
      setSearched(true);
    });

  const add = async (candidate: RosterCandidate) => {
    setPendingKey(candidate.studentKey);
    const res = await addStudentToCourse(courseId, candidate.studentKey);
    setPendingKey(null);

    if (!res.success) {
      toast.error(res.msg);
      return;
    }

    toast.success(res.msg);
    setQuery("");
    setResults([]);
    setSearched(false);
    onAdded();
  };

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Input
          value={query}
          placeholder="Namn eller e-post"
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      <div className="space-y-2">
        {results.map((candidate) => (
          <div
            key={candidate.studentKey}
            className="flex items-center justify-between gap-3 rounded border p-2 text-sm"
          >
            <div>
              <div className="font-medium">{candidate.name}</div>
              <div className="text-xs text-muted-foreground">
                {candidate.detail}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => add(candidate)}
              disabled={pendingKey !== null}
            >
              {pendingKey === candidate.studentKey
                ? "Lägger till…"
                : "Lägg till"}
            </Button>
          </div>
        ))}
        {!isSearching && searched && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ingen elev hittades. Sök på namn eller e-post, minst två tecken.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Tar bort en elev från kursen. Kommande bokningar tas bort och saldot
 * återställs; lektioner som redan varit står kvar som historik.
 */
export function RemoveFromCourseButton({
  courseId,
  courseName,
  studentKey,
  studentName,
  addedManually,
  onRemoved,
}: {
  courseId: string;
  courseName: string;
  studentKey: string;
  studentName: string;
  addedManually: boolean;
  /** Körs efter borttagningen. Utan den laddas sidan om. */
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const res = await removeStudentFromCourse(courseId, studentKey);
      if (!res.success) {
        toast.error(res.msg);
        return;
      }
      toast.success(res.msg);
      if (onRemoved) onRemoved();
      else router.refresh();
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <UserMinus className="h-4 w-4" />
          <span className="sr-only">Ta bort från kursen</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Ta bort {studentName} från {courseName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {addedManually
              ? "Eleven är tillagd för hand och har inget köp för kursen. Tillägget tas bort."
              : "Kommande bokningar i kursen tas bort och saldot återställs. Lektioner som redan varit står kvar. Köpet rörs inte, och eleven kan läggas till igen."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={remove}>Ta bort</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
