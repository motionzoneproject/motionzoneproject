"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import type { Lesson, Termin } from "@/generated/prisma/client";
import type {
  BookingWithPurchaseParticipant,
  UserPurchasesForCourse,
} from "@/lib/actions/admin";
import LessonItem from "./LessonItem";

interface Props {
  lessons: Lesson[];
  terminer: Termin[];
  bookingsByLessonId: Record<string, BookingWithPurchaseParticipant[]>;
  usersInCourse: UserPurchasesForCourse[];
}

export default function LessonsBrowser({
  lessons,
  terminer,
  bookingsByLessonId,
  usersInCourse,
}: Props) {
  const [selTermin, setselTermin] = useState<string>("all");
  const [showOldLessons, setShowOldLessons] = useState<boolean>(false);

  return (
    <Card>
      <CardContent>
        <div className="md:flex gap-2 w-full">
          <div>
            <Select onValueChange={(value) => setselTermin(value)}>
              <SelectTrigger className="min-w-50">
                <SelectValue placeholder="Alla terminer" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Terminer</SelectLabel>
                  <SelectItem value="all">Alla terminer</SelectItem>
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
              Visa gamla lektioner.
            </Label>
          </div>
        </div>
        <br />
        {(() => {
          const filteredLessons = lessons
            .filter((l) => selTermin === "all" || l.terminId === selTermin)
            .filter((l) => showOldLessons || l.startTime >= new Date())
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          if (filteredLessons.length === 0) {
            return (
              <div className="rounded border bg-muted/20 p-4 text-sm text-muted-foreground">
                Inga lektioner hittades för vald termin.
              </div>
            );
          }

          return (
            <div className="w-full max-h-[80vh] overflow-auto rounded border bg-background divide-y">
              {filteredLessons.map((l) => (
                <LessonItem
                  key={l.id}
                  lesson={l}
                  initialBookings={bookingsByLessonId[l.id] ?? []}
                  initialUsers={usersInCourse}
                />
              ))}
            </div>
          );
        })()}
      </CardContent>
      <CardFooter>
        <p>Kursen har totalt {lessons.length}st lektioner.</p>
      </CardFooter>
    </Card>
  );
}
