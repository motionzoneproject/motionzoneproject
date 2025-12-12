"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Termin } from "@/generated/prisma/client";
import type { LessonWithBookings } from "@/lib/actions/admin";

interface Props {
  lessonsWithBookings: LessonWithBookings[];
  terminer: Termin[];
}

export default function LessonsBrowser({
  lessonsWithBookings: lessons,
  terminer,
}: Props) {
  const [selTermin, setselTermin] = useState<string>();
  const [showOldLessons, setShowOldLessons] = useState<boolean>(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tillfällen</CardTitle>
        <CardDescription>
          Här kan du se och hantera alla tillfällen i kursen i en termin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div>
            <Select onValueChange={(value) => setselTermin(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Välj en termin" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Terminer</SelectLabel>
                  <SelectItem value="none">Ingen</SelectItem>
                  {terminer.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Checkbox
              checked={showOldLessons}
              onCheckedChange={(newValue: boolean) =>
                setShowOldLessons(newValue)
              }
            />{" "}
            Visa gamla tillfällen.
          </div>
        </div>
        <br />
        <div className="w-full p-2 border-2 rounded grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {lessons
            .filter((l) => l.terminId === selTermin)
            .filter((l) => showOldLessons || l.startTime >= new Date())
            .map((l) => (
              <div
                key={l.id}
                className="bg-blue-300 text-black p-2 border-2 border-blue-800 rounded"
              >
                <div>Datum: {l.startTime.toLocaleDateString("sv-SE")}</div>

                {/* Visar tiden (t.ex. 16:00 - 17:30) */}
                <div>
                  Tid:{" "}
                  {l.startTime.toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {l.endTime.toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {/* Visar veckodagen */}
                <div>
                  Veckodag:{" "}
                  {l.startTime.toLocaleDateString("sv-SE", { weekday: "long" })}
                </div>

                {/* Visar eventuellt antal bokningar kvar */}
                <div>Antal bokningar: {l.bookings.length}</div>
                <div>Max antal: {l.maxBookings}</div>
                <div>Närvaro</div>
              </div>
            ))}
        </div>
      </CardContent>
      <CardFooter>
        <p>Kursen har totalt {lessons.length}st tillfällen.</p>
      </CardFooter>
    </Card>
  );
}
