"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
import type {
  Course,
  SchemaItem,
  Termin,
  User,
} from "@/generated/prisma/client";
import { useSession } from "@/lib/session-provider";
import { getCourseName } from "@/lib/tools";
import { getVeckodag } from "../../termin/SchemaDay";
import { DatePickerWithRange } from "./DatePicker";

// Som jag tänker nu så kommer vi ha väldigt mycket data här dock, kanske bättre att hämta härifrån via useEffect? Vi börjar väl såhär.
interface Props {
  teachers: User[];
  terminer: Termin[];
  courses: Course[];
  schemaItems: SchemaItem[];
}

export function LecturesFilter({
  teachers,
  courses,
  schemaItems,
  terminer,
}: Props) {
  const searchParams = useSearchParams();

  const { user } = useSession();

  const pathname = usePathname();
  const { replace } = useRouter();

  const params = new URLSearchParams(searchParams);

  const setFilter = useCallback(
    (name: string, term: string) => {
      if (term) {
        params.set(name, term);
      } else {
        params.delete(name);
      }

      replace(`${pathname}?${params.toString()}`);
    },
    [params, pathname, replace],
  );

  return (
    <div className="w-full p-2 border-2 rounded">
      <div className="font-bold text-xl">Filter</div>
      <div className="flex gap-2">
        <div className="p-1">
          <Label className="p-1 mb-1">Lärare</Label>
          <Select
            defaultValue={params.get("teacher") ?? user?.id}
            onValueChange={
              (value) => setFilter("teacher", value === "all" ? "" : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj lärare" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Välj lärare</SelectLabel>
                <SelectItem value={"all"}>Alla</SelectItem>
                <SelectSeparator></SelectSeparator>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="p-1">
          <Label className="p-1 mb-1">Termin</Label>
          <Select
            defaultValue={params.get("termin") ?? ""}
            onValueChange={
              (value) => setFilter("termin", value === "all" ? "" : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj termin" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Välj termin</SelectLabel>
                <SelectItem value={"all"}>Alla</SelectItem>
                <SelectSeparator></SelectSeparator>
                {terminer.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="p-1">
          <Label className="p-1 mb-1">Kurs</Label>
          <Select
            defaultValue={params.get("course") ?? ""}
            onValueChange={
              (value) => setFilter("course", value === "all" ? "" : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj kurs" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Välj kurs</SelectLabel>
                <SelectItem value={"all"}>Alla</SelectItem>
                <SelectSeparator></SelectSeparator>
                {courses.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {getCourseName(t)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="p-1">
          <Label className="p-1 mb-1">Kurstillfälle:</Label>
          <Select
            defaultValue={params.get("schemaitem") ?? ""}
            onValueChange={
              (value) => setFilter("schemaitem", value === "all" ? "" : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj kurs" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Välj kurstillfälle</SelectLabel>
                <SelectItem value={"all"}>Alla</SelectItem>
                <SelectSeparator></SelectSeparator>
                {schemaItems.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {getVeckodag(t.weekday)} kl{" "}
                    {t.timeStart.toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {t.timeEnd.toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="p-1">
          <Label className="p-1 mb-1">Datum mellan:</Label>
          <DatePickerWithRange
            filterSetter={setFilter}
            from={params.get("from")}
            to={params.get("to")}
          />
        </div>

        <div className="p-1">
          <Label className="p-1 mb-1">Dölj gamla</Label>
          <Checkbox
            className="w-8 h-8"
            checked={params.get("hideold") === "true"}
            onCheckedChange={(checked) => {
              setFilter("hideold", checked === true ? "true" : "");
            }}
          />
        </div>
      </div>
    </div>
  );
}
