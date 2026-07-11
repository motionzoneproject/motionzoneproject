"use client";

import { EditIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import EditParticipantForm from "@/components/EditParticipantForm";
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
import { adminUpdatePurchaseRemainingCount } from "@/lib/actions/admin-students";
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

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
                  {formatDateTime(booking.startTime)} -{" "}
                  {new Date(booking.endTime).toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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

function ProductsDialog({ student }: { student: StudentSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const getClipUsedCount = (purchase: StudentSummary["purchases"][number]) =>
    purchase.purchaseItems.reduce((sum, item) => sum + item.bookingsCount, 0);

  const getClipTotalCount = (purchase: StudentSummary["purchases"][number]) =>
    getClipUsedCount(purchase) + (purchase.remainingCount ?? 0);

  const getItemTotalCount = (
    item: StudentSummary["purchases"][number]["purchaseItems"][number],
  ) => item.bookingsCount + item.remainingCount;

  const saveTotal = (input: {
    purchaseId: string;
    purchaseItemId?: string;
    key: string;
    minValue: number;
  }) => {
    const raw = values[input.key];
    const nextTotalCount = Number(raw);

    if (!Number.isInteger(nextTotalCount) || nextTotalCount < input.minValue) {
      toast.error(
        `Ange ett heltal som är minst ${input.minValue}. Det som redan använts kan inte underskridas.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await adminUpdatePurchaseRemainingCount({
        purchaseId: input.purchaseId,
        purchaseItemId: input.purchaseItemId,
        nextTotalCount,
      });

      if (!result.success) {
        toast.error("Kunde inte uppdatera saldo", {
          description: result.error,
        });
        return;
      }

      toast.success(result.message);
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <CountDialogButton
      count={student.purchases.length}
      open={isOpen}
      onOpenChange={setIsOpen}
      title={`Köpta produkter för ${student.name}`}
      description="Du kan ändra totalt antal klipp eller tillfällen, aldrig under det som redan använts."
    >
      <div className="space-y-4">
        {student.purchases.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Inga produkter hittades.
          </div>
        ) : (
          student.purchases.map((purchase) => {
            const clipUsedCount = getClipUsedCount(purchase);
            const clipTotalCount = getClipTotalCount(purchase);

            return (
              <div key={purchase.id} className="rounded border p-4">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{purchase.product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Typ: {purchase.type}
                    </div>
                    {purchase.type === "CLIP" ? (
                      <div className="text-sm text-muted-foreground">
                        Använda klipp: {clipUsedCount} • Kvar:{" "}
                        {purchase.remainingCount ?? 0}
                      </div>
                    ) : null}
                  </div>

                  {purchase.type === "CLIP" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={clipUsedCount}
                        className="h-9 w-24 rounded-md border px-3 text-sm"
                        value={
                          values[`purchase:${purchase.id}`] ??
                          String(clipTotalCount)
                        }
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [`purchase:${purchase.id}`]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          saveTotal({
                            purchaseId: purchase.id,
                            key: `purchase:${purchase.id}`,
                            minValue: clipUsedCount,
                          })
                        }
                      >
                        Spara
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {purchase.purchaseItems.map((item) => {
                    const itemTotalCount = getItemTotalCount(item);

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1 text-sm">
                          <div className="font-medium">{item.courseName}</div>
                          <div className="text-muted-foreground">
                            Bokningar: {item.bookingsCount}
                          </div>
                          {item.unlimited ? (
                            <div className="text-muted-foreground">
                              Obegränsad tillgång
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              Använda: {item.bookingsCount} • Kvar:{" "}
                              {item.remainingCount}
                            </div>
                          )}
                        </div>

                        {purchase.type !== "CLIP" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={item.bookingsCount}
                              disabled={item.unlimited}
                              className="h-9 w-24 rounded-md border px-3 text-sm disabled:opacity-50"
                              value={
                                values[`item:${item.id}`] ??
                                String(itemTotalCount)
                              }
                              onChange={(event) =>
                                setValues((current) => ({
                                  ...current,
                                  [`item:${item.id}`]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isPending || item.unlimited}
                              onClick={() =>
                                saveTotal({
                                  purchaseId: purchase.id,
                                  purchaseItemId: item.id,
                                  key: `item:${item.id}`,
                                  minValue: item.bookingsCount,
                                })
                              }
                            >
                              Spara
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
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
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell className="font-medium">
                  <DetailsDialog
                    id={student.participantId ?? student.userId}
                    isParticipant={!!student.participantId}
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
                  <ProductsDialog student={student} />
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
