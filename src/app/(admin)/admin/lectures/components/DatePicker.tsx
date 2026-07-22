"use client";

import { addDays, isValid } from "date-fns";
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
import {
  endOfStockholmDay,
  formatDateToInputStr,
  formatShortFriendlyDate,
  parseStockholmDateInput,
  startOfStockholmDay,
} from "@/lib/date-utils";

interface Props {
  from?: string | null;
  to?: string | null;
  filterSetter: (name: string, value: string) => void;
}

const parseDateParam = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = parseStockholmDateInput(value);
  return isValid(parsed) ? parsed : undefined;
};

const startOfDay = (value: Date) => {
  return startOfStockholmDay(value);
};

const endOfDay = (value: Date) => {
  return endOfStockholmDay(value);
};

export function DatePickerWithRange({ filterSetter, from, to }: Props) {
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);

  const [useDateFilter, setUseDateFilter] = React.useState<boolean>(
    !!(fromDate && toDate),
  );

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: fromDate ?? startOfDay(new Date()),
    to: toDate ?? endOfDay(addDays(new Date(), 7)),
  });

  const fs = React.useCallback(
    (a: string, b: string) => {
      filterSetter(a, b);
    },
    [filterSetter],
  );

  const updateFilters = React.useCallback(
    (range?: DateRange) => {
      const rangeFrom = range?.from ? formatDateToInputStr(range.from) : "";
      const rangeTo = range?.to ? formatDateToInputStr(range.to) : "";

      if (!useDateFilter) {
        fs("from", "");
        fs("to", "");
      } else {
        fs("from", rangeFrom);
        fs("to", rangeTo);
      }
    },
    [useDateFilter, fs],
  );

  React.useEffect(() => {
    updateFilters(date);
  }, [date, updateFilters]);

  return (
    <div className="flex gap-1 items-center">
      <Checkbox
        className="w-8 h-8"
        checked={useDateFilter}
        onCheckedChange={(checked) => {
          setUseDateFilter(checked === true);
        }}
      />
      <Field className="mx-auto w-60">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              id="date-picker-range"
              className="justify-start px-2.5 font-normal"
            >
              <CalendarIcon />
              {date?.from ? (
                date.to ? (
                  <>
                    {formatShortFriendlyDate(date.from)} -{" "}
                    {formatShortFriendlyDate(date.to)}
                  </>
                ) : (
                  formatShortFriendlyDate(date.from)
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
              onSelect={(range) => {
                setDate(range);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </Field>
    </div>
  );
}
