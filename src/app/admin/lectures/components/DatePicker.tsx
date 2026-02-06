"use client";

import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  from?: string | null;
  to?: string | null;
  filterSetter: (name: string, value: string) => void;
}

const parseDateParam = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export function DatePickerWithRange({ filterSetter, from, to }: Props) {
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);
  const [all, setAll] = React.useState<boolean>(false);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: fromDate ?? new Date(new Date().getFullYear(), 0, 20),
    to: toDate ?? addDays(new Date(new Date().getFullYear(), 0, 20), 20),
  });

  const updateFilters = (next?: DateRange) => {
    const nextFrom = next?.from ? format(next.from, "yyyy-MM-dd") : "";
    const nextTo = next?.to ? format(next.to, "yyyy-MM-dd") : "";

    if (all) {
      filterSetter("from", "");
      filterSetter("to", "");
      return;
    }

    if ((from ?? "") !== nextFrom) {
      filterSetter("from", nextFrom);
    }
    if ((to ?? "") !== nextTo) {
      filterSetter("to", nextTo);
    }
  };

  return (
    <div className="flex gap-1 items-center">
      <Checkbox
        className="w-8 h-8"
        checked={all}
        onCheckedChange={(checked) => {
          setAll(checked === true);
          updateFilters(date);
        }}
      />
      <Field className="mx-auto w-60">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker-range"
              className="justify-start px-2.5 font-normal"
            >
              <CalendarIcon />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Välj datum</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(next) => {
                setDate(next);
                updateFilters(next);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </Field>
    </div>
  );
}
