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
import { Label } from "@/components/ui/label";
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
import LessonItem from "./LessonItem";

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
        <div className="md:flex gap-2">
          <div>
            <Select onValueChange={(value) => setselTermin(value)}>
              <SelectTrigger className="w-full">
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
          <div className="flex gap-2 items-center my-2">
            <Checkbox
              id="showOld"
              className="w-6 h-6"
              checked={showOldLessons}
              onCheckedChange={(newValue: boolean) =>
                setShowOldLessons(newValue)
              }
            />
            <Label htmlFor="showOld" className="text-md">
              Visa gamla tillfällen.
            </Label>
          </div>
        </div>
        <br />
        <div className="w-full bg-secondary p-2 border-2 rounded grid md:grid-cols-2 gap-2 max-h-[80vh] overflow-auto">
          {lessons
            .filter((l) => l.terminId === selTermin)
            .filter((l) => showOldLessons || l.startTime >= new Date())
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
            .map((l) => (
              <LessonItem key={l.id} lesson={l} />
            ))}
        </div>
      </CardContent>
      <CardFooter>
        <p>Kursen har totalt {lessons.length}st tillfällen.</p>
      </CardFooter>
    </Card>
  );
}
