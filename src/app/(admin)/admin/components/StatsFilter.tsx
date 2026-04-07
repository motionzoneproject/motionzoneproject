"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "../lectures/components/DatePicker";

type TerminOption = {
  id: string;
  name: string;
};

type Props = {
  terminer: TerminOption[];
  value: string;
  from?: string | null;
  to?: string | null;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onDateFilterChange: (name: string, value: string) => void;
};

export function StatsFilter({
  terminer,
  value,
  from,
  to,
  disabled = false,
  onValueChange,
  onDateFilterChange,
}: Props) {
  return (
    <div className="w-full rounded border-2 p-3">
      <div className="text-xl font-bold">Filter</div>

      <div className="mt-2">
        {/* fix: Termin needs to retrieve the data differently by getting all the courses in the schema, and all the orders made with products containing that courses. So we hide the termin from the filter for later. But we could use the same functions, just some function recieving that info and then call the same actions based on first and last order-dates. */}

        <div className="space-y-1 hidden">
          <Label className="text-sm">Termin</Label>

          <Select value={value} onValueChange={onValueChange} disabled={true}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj termin" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Välj termin</SelectLabel>

                <SelectItem value="all">Alla</SelectItem>

                <SelectSeparator />

                {terminer.map((termin) => (
                  <SelectItem key={termin.id} value={termin.id}>
                    {termin.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {value === "all" && (
          <div className="space-y-1 max-w-fit">
            <Label className="text-sm">Datum mellan</Label>

            <div
              className={
                disabled ? "pointer-events-none opacity-60" : "" + "max-w-fit"
              }
            >
              <DatePickerWithRange
                from={from}
                to={to}
                filterSetter={onDateFilterChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
