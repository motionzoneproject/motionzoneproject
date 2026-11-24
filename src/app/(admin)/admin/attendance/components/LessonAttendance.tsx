"use client";

import {
  CheckCheck,
  Contact,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Users,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
 *
 * Varje kryss sparas direkt. Läraren står med telefonen och listan kan vara
 * lång — en sparknapp längst ner var lätt att missa, och då försvann allt.
 * Den som ingen rört förblir omarkerad tills läraren trycker "Klar", som
 * markerar resten som frånvarande.
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
  const [isFinishing, setIsFinishing] = useState(false);
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

  // Lärarens klick, som visas direkt medan de sparas. Övrigt visas som det
  // står i registret, så att en markering någon annan gjort syns när listan
  // hämtats om.
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Set<string>>(() => new Set());
  const presentOf = (student: AttendanceStudent): boolean | undefined =>
    marks[student.studentKey] ??
    (student.status === null ? undefined : student.status === "PRESENT");

  // När listan hämtats om tar registret över. Klick som fortfarande sparas
  // ligger kvar, annars skulle kryssrutan hoppa tillbaka en stund.
  const [shownStudents, setShownStudents] = useState(lesson.students);
  if (shownStudents !== lesson.students) {
    setShownStudents(lesson.students);
    setMarks((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([key]) => saving.has(key)),
      ),
    );
  }

  // Varje klick hämtar inte om hela sidan. Det görs en stund efter det
  // senaste, och direkt om listan stängs innan dess.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshNow = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = null;
    onChanged?.();
    router.refresh();
  };
  // Timern och avmonteringen ska anropa den senaste refreshNow.
  const refreshNowRef = useRef(refreshNow);
  useEffect(() => {
    refreshNowRef.current = refreshNow;
  });
  const refreshSoon = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => refreshNowRef.current(), 1500);
  };
  useEffect(
    () => () => {
      if (refreshTimer.current) refreshNowRef.current();
    },
    [],
  );

  // Det senaste klicket per elev. Svarar ett äldre anrop sent ska det inte
  // ändra det läraren klickat sedan.
  const latest = useRef<Record<string, number>>({});

  /** Visar markeringarna direkt, sparar dem och backar om det misslyckas. */
  const mark = async (changes: { studentKey: string; present: boolean }[]) => {
    if (changes.length === 0) return;
    const keys = changes.map((c) => c.studentKey);
    const before = Object.fromEntries(keys.map((k) => [k, marks[k]]));
    const tokens: Record<string, number> = {};
    for (const key of keys) {
      tokens[key] = (latest.current[key] ?? 0) + 1;
      latest.current[key] = tokens[key];
    }
    const isLatest = (key: string) => latest.current[key] === tokens[key];

    setMarks((prev) => ({
      ...prev,
      ...Object.fromEntries(changes.map((c) => [c.studentKey, c.present])),
    }));
    setSaving((prev) => new Set([...prev, ...keys]));

    let ok = false;
    try {
      const res = await saveAttendance(lesson.lessonId, changes);
      ok = res.success;
      if (!ok) toast.error(res.msg);
    } catch {
      toast.error("Kunde inte spara närvaron. Försök igen.");
    }

    if (!ok) {
      setMarks((prev) => {
        const next = { ...prev };
        for (const key of keys) {
          if (!isLatest(key)) continue;
          if (before[key] === undefined) delete next[key];
          else next[key] = before[key];
        }
        return next;
      });
    }
    setSaving((prev) => {
      const next = new Set(prev);
      for (const key of keys) if (isLatest(key)) next.delete(key);
      return next;
    });
    if (ok) refreshSoon();
  };

  const markAllPresent = () =>
    void mark(
      lesson.students
        .filter((student) => presentOf(student) !== true)
        .map((student) => ({ studentKey: student.studentKey, present: true })),
    );

  const unmarked = lesson.students.filter(
    (student) => presentOf(student) === undefined,
  );

  /**
   * Markerar de omarkerade som frånvarande — men bara de som ingen annan
   * hunnit markera (onlyIfUnmarked), så två som tar närvaro samtidigt inte
   * skriver över varandra.
   */
  const finish = async () => {
    const changes: AttendanceMark[] = unmarked.map((student) => ({
      studentKey: student.studentKey,
      present: false,
      onlyIfUnmarked: true,
    }));
    if (changes.length === 0) return;

    setIsFinishing(true);
    try {
      const res = await saveAttendance(lesson.lessonId, changes);
      if (res.success) {
        setMarks((prev) => ({
          ...prev,
          ...Object.fromEntries(changes.map((c) => [c.studentKey, false])),
        }));
        toast.success(res.msg);
        refreshNow();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setIsFinishing(false);
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
          disabled={lesson.students.every((s) => presentOf(s) === true)}
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

        {lesson.showStudentList && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/students?course=${lesson.courseId}`}>
              <ExternalLink className="h-4 w-4" />
              Visa i elevlistan
            </Link>
          </Button>
        )}
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
                      void mark([
                        {
                          studentKey: student.studentKey,
                          present: checked === true,
                        },
                      ])
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
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      {value === undefined
                        ? "Ej markerad"
                        : value
                          ? "Närvarande"
                          : "Frånvarande"}
                      {saving.has(student.studentKey) && (
                        <Loader2
                          aria-label="Sparar"
                          className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                        />
                      )}
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

      {lesson.students.length > 0 && (
        <div className="border-t p-3">
          {unmarked.length > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={finish}
                disabled={isFinishing}
              >
                <UserX className="h-4 w-4" />
                {isFinishing
                  ? "Sparar..."
                  : `Klar – markera ${unmarked.length} omarkerade frånvarande`}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Varje kryss sparas direkt.
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Alla är markerade. Varje kryss sparas direkt.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
