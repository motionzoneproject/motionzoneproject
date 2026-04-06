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
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-sm">Termin</Label>
          <Select
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
          >
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
          <div className="space-y-1">
            <Label className="text-sm">Datum mellan</Label>
            <div className={disabled ? "pointer-events-none opacity-60" : ""}>
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
