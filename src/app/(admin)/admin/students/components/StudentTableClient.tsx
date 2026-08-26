"use client";

import { EditIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import EditParticipantForm from "@/components/EditParticipantForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { removeUserFromLesson } from "@/lib/actions/admin";
import {
  calculateAge,
  formatDateToInputStr,
  formatFriendlyDateTime,
} from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { ProductEditorDialog } from "../../components/ProductEditorDialog";
import type { StudentSummary } from "../page";
import { DetailsDialog } from "./DetailsDialog";
import { MailDialog } from "./MailDialog";
import StudentUserEditDialog from "./StudentUserEditDialog";
import type { SelectedStudent, StudentsSelectedType } from "./studentSelection";

const STORAGE_KEY = "admin-students-selection";

function getStudentEmail(student: StudentSummary) {
  return (
    student.participant?.email ||
    student.participant?.addedBy.email ||
    student.user.email
  );
}

function getAllowPhotoVideo(student: StudentSummary) {
  return (
    student.participant?.allowPhotoVideo ??
    student.user.details?.allowPhotoVideo ??
    false
  );
}

function isSelectedStudent(value: unknown): value is SelectedStudent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SelectedStudent>;
  return (
    typeof candidate.studentKey === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string"
  );
}

function isStudentsSelectedType(value: unknown): value is StudentsSelectedType {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isSelectedStudent);
}

function CountDialogButton({
  count,
  title,
  description,
  children,
  open: openProp,
  onOpenChange,
}: {
  count: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <EditIcon className="h-4 w-4" />({count}st)
        </Button>
      </DialogTrigger>
      <DialogContent
        id={id}
        className="max-h-[90dvh] overflow-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Stäng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoursesDialog({ student }: { student: StudentSummary }) {
  return (
    <CountDialogButton
      count={student.courses.length}
      title={`Kurser för ${student.name}`}
      description="Visar alla kurser eleven har via sina purchases."
    >
      <div className="space-y-2">
        {student.courses.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Inga kurser hittades.
          </div>
        ) : (
          student.courses.map((course) => (
            <div key={course.id} className="rounded border p-3 text-sm">
              {course.name}
            </div>
          ))
        )}
      </div>
    </CountDialogButton>
  );
}

function TermsDialog({ student }: { student: StudentSummary }) {
  return (
    <CountDialogButton
      count={student.terminer.length}
      title={`Terminer för ${student.name}`}
      description="Visar alla terminer kopplade till elevens kurser."
    >
      <div className="space-y-2">
        {student.terminer.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Inga terminer hittades.
          </div>
        ) : (
          student.terminer.map((termin) => (
            <div key={termin.id} className="rounded border p-3 text-sm">
              {termin.name}
            </div>
          ))
        )}
      </div>
    </CountDialogButton>
  );
}

function BookingsDialog({ student }: { student: StudentSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRemove = (purchaseItemId: string, lessonId: string) => {
    startTransition(async () => {
      const result = await removeUserFromLesson(purchaseItemId, lessonId);
      if (!result.success) {
        toast.error("Kunde inte avboka", { description: result.msg });
        return;
      }

      toast.success("Bokningen togs bort");
      router.refresh();
    });
  };

  return (
    <CountDialogButton
      count={student.bookings.length}
      title={`Bokningar för ${student.name}`}
      description="Aktiva bokningar. Du kan snabbt avboka direkt här."
    >
      <div className="space-y-2">
        {student.bookings.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Inga bokningar hittades.
          </div>
        ) : (
          student.bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between gap-3 rounded border p-3"
            >
              <div className="space-y-1 text-sm">
                <div className="font-medium">{booking.courseName}</div>
                <div className="text-muted-foreground">
                  {formatFriendlyDateTime(booking.startTime, "sv-SE")} -{" "}
                  {dbToFormTime(booking.endTime)}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() =>
                  handleRemove(booking.purchaseItemId, booking.lessonId)
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Avboka</span>
              </Button>
            </div>
          ))
        )}
      </div>
    </CountDialogButton>
  );
}

export default function StudentTableClient({
  students,
}: {
  students: StudentSummary[];
}) {
  const [selectedStudents, setSelectedStudents] =
    useState<StudentsSelectedType>({});

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);

      if (!isStudentsSelectedType(parsed)) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setSelectedStudents(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedStudents));
  }, [selectedStudents]);

  const currentPageKeys = useMemo(
    () => students.map((student) => student.studentKey),
    [students],
  );

  const selectedCount = Object.keys(selectedStudents).length;
  const allOnPageSelected =
    currentPageKeys.length > 0 &&
    currentPageKeys.every((studentKey) => selectedStudents[studentKey]);
  const someOnPageSelected =
    !allOnPageSelected &&
    currentPageKeys.some((studentKey) => selectedStudents[studentKey]);

  const toggleStudent = (student: StudentSummary, checked: boolean) => {
    setSelectedStudents((current) => {
      const next = { ...current };
      if (checked) {
        next[student.studentKey] = {
          studentKey: student.studentKey,
          name: student.name,
          email: getStudentEmail(student),
        };
      } else {
        delete next[student.studentKey];
      }
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedStudents((current) => {
      const next = { ...current };
      if (allOnPageSelected) {
        for (const student of students) {
          delete next[student.studentKey];
        }
        return next;
      }

      for (const student of students) {
        next[student.studentKey] = {
          studentKey: student.studentKey,
          name: student.name,
          email: getStudentEmail(student),
        };
      }
      return next;
    });
  };

  const removeSelectedStudent = (studentKey: string) => {
    setSelectedStudents((current) => {
      const next = { ...current };
      delete next[studentKey];
      return next;
    });
  };

  const selectedList = Object.values(selectedStudents).sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded border p-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <div className="font-medium">Mailutskick</div>
            <div className="text-sm text-muted-foreground">
              {selectedCount} elev{selectedCount === 1 ? "" : "er"} markerade
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={toggleAllOnPage}>
              {allOnPageSelected ? "Avmarkera sidan" : "Välj alla"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={selectedCount === 0}
              onClick={() => setSelectedStudents({})}
            >
              Rensa val
            </Button>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={selectedCount === 0}
            >
              Visa lista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Valda elever för mailutskick</DialogTitle>
              <DialogDescription>
                Totalt {selectedCount} markerade elever över alla sidor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {selectedList.map((student) => (
                <Item key={student.studentKey} variant="outline" size="sm">
                  <ItemContent>
                    <ItemTitle>{student.name}</ItemTitle>
                    <ItemDescription>{student.email}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeSelectedStudent(student.studentKey)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Ta bort {student.name}</span>
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Stäng
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MailDialog selectedStudents={selectedList} />
      </div>

      <div className="mt-2">
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    allOnPageSelected
                      ? true
                      : someOnPageSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={() => toggleAllOnPage()}
                  aria-label="Välj alla elever på sidan"
                />
              </TableHead>
              <TableHead>Namn</TableHead>
              <TableHead>Ålder</TableHead>
              <TableHead>Bild/Video</TableHead>
              <TableHead>Detaljer</TableHead>
              <TableHead>Köpare</TableHead>
              <TableHead>Kurser</TableHead>
              <TableHead>Terminer</TableHead>
              <TableHead>Bokningar</TableHead>
              <TableHead>Produkter</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.studentKey}>
                <TableCell>
                  <Checkbox
                    checked={Boolean(selectedStudents[student.studentKey])}
                    onCheckedChange={(checked) =>
                      toggleStudent(student, checked === true)
                    }
                    aria-label={`Välj ${student.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{student.name}</span>
                    {!student.hasApprovedPurchase && student.hasPendingOrder ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400"
                      >
                        Ej beviljad än
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {student.dateOfBirth ? (
                    <span title={formatDateToInputStr(student.dateOfBirth)}>
                      {calculateAge(student.dateOfBirth)} år
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {getAllowPhotoVideo(student) ? (
                    <Badge variant="default">Ja</Badge>
                  ) : (
                    <Badge variant="destructive">Nej</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <DetailsDialog
                    id={student.participantId ?? student.userId}
                    isParticipant={!!student.participantId}
                    hasApprovedPurchase={student.hasApprovedPurchase}
                  />
                </TableCell>
                <TableCell>{student.customerName ?? "-"}</TableCell>
                <TableCell>
                  <CoursesDialog student={student} />
                </TableCell>
                <TableCell>
                  <TermsDialog student={student} />
                </TableCell>
                <TableCell>
                  <BookingsDialog student={student} />
                </TableCell>
                <TableCell>
                  <ProductEditorDialog
                    scope="student"
                    userId={student.userId}
                    participantId={student.participantId}
                    triggerLabel={`(${student.purchases.length}st)`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {student.participant ? (
                      <EditParticipantForm participant={student.participant} />
                    ) : (
                      <StudentUserEditDialog user={student.user} />
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={
                          student.participant
                            ? `/admin/orders?status=ALL&participantId=${encodeURIComponent(
                                student.participant.id,
                              )}`
                            : `/admin/orders?status=ALL&q=${encodeURIComponent(
                                student.user.name,
                              )}`
                        }
                      >
                        Ordrar
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {students.length === 0 ? (
          <div className="p-2 text-sm italic text-muted-foreground">
            Inga elever hittades.
          </div>
        ) : null}
      </div>
    </div>
  );
}
