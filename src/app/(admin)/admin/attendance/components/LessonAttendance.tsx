"use client";

import { CheckCheck, Contact, Mail, Phone, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type AttendanceLesson,
  type AttendanceMark,
  type AttendanceStudent,
  saveAttendance,
} from "@/lib/actions/attendance-actions";
import type { ContactValue, StudentContact } from "@/lib/student-contact";
import { CourseRosterDialog } from "../../components/CourseRosterDialog";

/**
 * Bara det som hjälper att känna igen eleven. Köp och saldo hör till
 * bokningarna, inte hit.
 */
function studentDetails(student: AttendanceStudent): string {
  return [
    student.customerName ? `Kund: ${student.customerName}` : null,
    !student.inCourse ? "inte längre i kursen" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Pricken på ring- och mailknappen: uppgiften går till kunden (oftast
 * föräldern), inte till eleven. Förklaras ovanför listan.
 */
function CustomerDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500 ${className}`}
    />
  );
}

const iconButton =
  "relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-muted";

/**
 * Ring, maila och visa kontakt, till höger på raden. Läraren når eleven eller
 * föräldern med ett tryck, och fäller ut uppgifterna bara när hen vill se dem.
 *
 * Knapparna ligger i radens label, men länkar och knappar är interaktiva och
 * ändrar därför inte kryssrutan när man trycker på dem.
 */
function ContactButtons({
  contact,
  shown,
  onToggle,
}: {
  contact: StudentContact;
  shown: boolean;
  onToggle: () => void;
}) {
  if (!contact.phone && !contact.email) return null;

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          // Säkerhetsbälte: låt inte klicket nå labeln och kryssrutan.
          e.preventDefault();
          onToggle();
        }}
        aria-expanded={shown}
        aria-label={shown ? "Dölj kontaktuppgifter" : "Visa kontaktuppgifter"}
        title={shown ? "Dölj kontaktuppgifter" : "Visa kontaktuppgifter"}
        className={`${iconButton} ${shown ? "bg-muted" : ""}`}
      >
        <Contact className="h-4 w-4" />
      </button>
      {contact.phone && (
        <ContactButton
          href={`tel:${contact.phone.value.replace(/[^\d+]/g, "")}`}
          verb="Ring"
          contact={contact.phone}
          icon={<Phone className="h-4 w-4" />}
        />
      )}
      {contact.email && (
        <ContactButton
          href={`mailto:${contact.email.value}`}
          verb="Maila"
          contact={contact.email}
          icon={<Mail className="h-4 w-4" />}
        />
      )}
    </span>
  );
}

function ContactButton({
  href,
  verb,
  contact,
  icon,
}: {
  href: string;
  verb: string;
  contact: ContactValue;
  icon: ReactNode;
}) {
  const whose = contact.viaCustomer ? "kunden" : "eleven";
  const label = `${verb} ${whose}: ${contact.value}`;
  return (
    <a href={href} aria-label={label} title={label} className={iconButton}>
      {icon}
      {contact.viaCustomer && (
        <CustomerDot className="absolute -top-1 -right-1" />
      )}
    </a>
  );
}

/** Kontaktuppgifterna i text, under namnet, när läraren fällt ut dem. */
function ContactDetails({ contact }: { contact: StudentContact }) {
  const rows = [
    ["Telefon", contact.phone],
    ["Mejl", contact.email],
  ] as const;
  return (
    <span className="mt-1 block space-y-0.5 text-sm">
      {rows.map(([label, value]) =>
        value ? (
          <span key={label} className="block break-all">
            <span className="text-muted-foreground">{label}: </span>
            <span className="select-all">{value.value}</span>
            {value.viaCustomer && (
              <span className="text-xs text-muted-foreground"> (kundens)</span>
            )}
          </span>
        ) : null,
      )}
    </span>
  );
}

/**
 * En lektions elevlista med en kryssruta var.
 *
 * Listan är kursens elever — samma som "Hantera elever". Används både på
 * närvarosidan och i dialogen som öppnas från översikten och lektionslistan.
 *
 * Rör varken bokningar eller klipp. Närvaron är ett eget register; vilka
 * bokningar som saknar närvaro syns i stället i lektionens bokningar.
 */
export function LessonAttendance({
  lesson,
  onChanged,
}: {
  lesson: AttendanceLesson;
  /** Körs när något sparats eller listan kan ha ändrats. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  // Vilka elevers kontaktuppgifter som är utfällda.
  const [shownContacts, setShownContacts] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleContact = (studentKey: string) =>
    setShownContacts((prev) => {
      const next = new Set(prev);
      if (!next.delete(studentKey)) next.add(studentKey);
      return next;
    });

  // Bara lärarens egna, ännu inte inlästa ändringar. Övrigt visas som det
  // står i registret, så att en markering någon annan gjort syns när listan
  // hämtats om.
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const presentOf = (student: AttendanceStudent): boolean | undefined =>
    marks[student.studentKey] ??
    (student.status === null ? undefined : student.status === "PRESENT");

  // När listan hämtats om efter en sparning släpps de sparade ändringarna,
  // så att registrets värde tar över — det kan skilja sig om någon annan
  // hann markera samma elev. Osparade ändringar ligger kvar.
  const [savedKeys, setSavedKeys] = useState<Set<string> | null>(null);
  const [shownStudents, setShownStudents] = useState(lesson.students);
  if (shownStudents !== lesson.students) {
    setShownStudents(lesson.students);
    if (savedKeys) {
      setMarks((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([key]) => !savedKeys.has(key)),
        ),
      );
      setSavedKeys(null);
    }
  }

  const refresh = () => {
    onChanged?.();
    router.refresh();
  };

  const markAllPresent = () => {
    const next: Record<string, boolean> = {};
    for (const student of lesson.students) next[student.studentKey] = true;
    setMarks(next);
  };

  const save = async () => {
    // Bara det som ändrats skickas, så att två som tar närvaro samtidigt
    // inte skriver över varandras markeringar. Den som inte bockats i och
    // saknar markering blir frånvarande — men bara om ingen annan hunnit
    // markera hen (onlyIfUnmarked).
    const changes: AttendanceMark[] = lesson.students.flatMap((student) => {
      const local = marks[student.studentKey];
      if (local === undefined) {
        return student.status === null
          ? [
              {
                studentKey: student.studentKey,
                present: false,
                onlyIfUnmarked: true,
              },
            ]
          : [];
      }
      const status = local ? "PRESENT" : "ABSENT";
      return status === student.status
        ? []
        : [{ studentKey: student.studentKey, present: local }];
    });

    if (changes.length === 0) {
      toast.success("Inga ändringar att spara.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveAttendance(lesson.lessonId, changes);
      if (res.success) {
        // Visa det sparade tills listan hämtats om: den som inte bockats i
        // är nu frånvarande.
        setMarks((prev) => ({
          ...prev,
          ...Object.fromEntries(changes.map((m) => [m.studentKey, m.present])),
        }));
        setSavedKeys(new Set(changes.map((m) => m.studentKey)));
        toast.success(res.msg);
        refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={markAllPresent}
          disabled={lesson.students.length === 0}
        >
          <CheckCheck className="h-4 w-4" />
          Alla närvarande
        </Button>

        <CourseRosterDialog
          courseId={lesson.courseId}
          onClosed={onChanged}
          trigger={
            <Button type="button" variant="ghost" size="sm">
              <Users className="h-4 w-4" />
              Hantera elever på kursen
            </Button>
          }
        />
      </div>

      {lesson.students.some(
        (s) => s.contact.phone?.viaCustomer || s.contact.email?.viaCustomer,
      ) && (
        <p className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
          <CustomerDot />
          <span>
            <span className="font-medium">Orange plupp</span> = ring eller maila
            går till kunden (oftast föräldern), inte till eleven.
          </span>
        </p>
      )}

      {lesson.students.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Ingen går kursen ännu. Lägg till elever under &ldquo;Hantera elever på
          kursen&rdquo;.
        </p>
      ) : (
        <ul className="divide-y">
          {lesson.students.map((student) => {
            const id = `${lesson.lessonId}-${student.studentKey}`;
            const value = presentOf(student);

            return (
              <li key={student.studentKey}>
                <label
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    id={id}
                    className="h-6 w-6"
                    checked={value === true}
                    onCheckedChange={(checked) =>
                      setMarks((prev) => ({
                        ...prev,
                        [student.studentKey]: checked === true,
                      }))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base">
                      {student.name}
                      {student.age !== null && (
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          · {student.age} år
                        </span>
                      )}
                    </span>
                    <span className="block text-sm font-bold">
                      {value === undefined
                        ? "Ej markerad"
                        : value
                          ? "Närvarande"
                          : "Frånvarande"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {studentDetails(student)}
                    </span>
                    {!student.contact.phone && !student.contact.email ? (
                      <span className="block text-xs text-muted-foreground">
                        Inga kontaktuppgifter
                      </span>
                    ) : (
                      shownContacts.has(student.studentKey) && (
                        <ContactDetails contact={student.contact} />
                      )
                    )}
                  </span>
                  {student.pending && (
                    <span className="shrink-0 rounded-full border border-amber-500/50 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                      Ej beviljad
                    </span>
                  )}
                  {student.booked && (
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      Bokad
                    </span>
                  )}
                  <ContactButtons
                    contact={student.contact}
                    shown={shownContacts.has(student.studentKey)}
                    onToggle={() => toggleContact(student.studentKey)}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t p-3">
        <Button
          type="button"
          className="w-full"
          onClick={save}
          disabled={isSaving || lesson.students.length === 0}
        >
          {isSaving ? "Sparar..." : "Spara närvaro"}
        </Button>
      </div>
    </div>
  );
}
