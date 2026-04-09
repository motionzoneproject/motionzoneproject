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
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card/60 p-4">
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Termin
        </Label>

        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger className="w-48">
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
        <div className={disabled ? "pointer-events-none opacity-60" : ""}>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">
            Datum mellan
          </Label>
          <DatePickerWithRange
            from={from}
            to={to}
            filterSetter={onDateFilterChange}
          />
        </div>
      )}
    </div>
  );
}
