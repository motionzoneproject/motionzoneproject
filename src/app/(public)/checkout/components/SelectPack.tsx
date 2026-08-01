"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseOption {
  courseId: string;
  courseName: string;
}

interface SelectPackProps {
  maxCourses: number;
  courses: CourseOption[];
  /** Array of length maxCourses – empty string means "not chosen yet" */
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function SelectPack({
  maxCourses,
  courses,
  selected,
  onChange,
}: SelectPackProps) {
  // Ensure the array always has exactly maxCourses slots
  const slots = Array.from({ length: maxCourses }, (_, i) => selected[i] ?? "");

  const updateSlot = (index: number, value: string) => {
    const next = [...slots];
    next[index] = value;
    onChange(next);
  };

  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-muted-foreground">
        Välj {maxCourses} {maxCourses === 1 ? "kurs" : "kurser"} du vill använda
        ditt paket på:
      </p>
      <div className="grid gap-2">
        {slots.map((currentValue, i) => {
          // Other slots' chosen courseIds – used to disable already-picked courses
          const otherSelected = slots.filter((v, idx) => idx !== i && v !== "");

          return (
            <div
              key={`${i}-${currentValue}`}
              className="flex items-center gap-2"
            >
              <span className="w-6 shrink-0 text-center text-sm font-medium text-muted-foreground">
                {i + 1}.
              </span>
              <Select
                value={currentValue || undefined}
                onValueChange={(val) => updateSlot(i, val)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Välj en kurs…" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem
                      key={c.courseId}
                      value={c.courseId}
                      disabled={otherSelected.includes(c.courseId)}
                    >
                      {c.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
