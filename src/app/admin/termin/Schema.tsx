import { Accordion } from "@/components/ui/accordion";
import { Weekday } from "@/generated/prisma/enums";
import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import SchemaDay from "./SchemaDay";

interface SchemaProps {
  schemaItems: SchemaItemWithCourse[];
}

export default function Schema({ schemaItems }: SchemaProps) {
  const weekdays = Object.keys(Weekday);

  return (
    <Accordion type="single" collapsible>
      {weekdays.map((day) => {
        return (
          <SchemaDay
            schemaItems={schemaItems}
            weekday={day as Weekday}
            weekdayIndex={weekdays.indexOf(day)}
            key={day}
          ></SchemaDay>
        );
      })}

      {/* 
      <AccordionItem value="day1">
        <AccordionTrigger>
          Tisdag (
          {schemaItems.filter((itm) => itm.weekday === "TUESDAY").length})
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "TUESDAY")
          .sort((a, b) =>
            dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart))
          )
          .map(async (itm) => {
            // const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itm.course.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day2">
        <AccordionTrigger>
          Onsdag (
          {schemaItems.filter((itm) => itm.weekday === "WEDNESDAY").length})
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "WEDNESDAY")
          .sort((a, b) =>
            dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart))
          )
          .map(async (itm) => {
            // const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itm.course.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day3">
        <AccordionTrigger>
          Torsdag (
          {schemaItems.filter((itm) => itm.weekday === "THURSDAY").length})
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "THURSDAY")
          .sort((a, b) =>
            dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart))
          )
          .map(async (itm) => {
            // const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itm.course.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day4">
        <AccordionTrigger>
          Fredag ({schemaItems.filter((itm) => itm.weekday === "FRIDAY").length}
          )
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "FRIDAY")
          .sort((a, b) =>
            dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart))
          )
          .map(async (itm) => {
            // const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itm.course.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day5">
        <AccordionTrigger>
          Lördag (
          {schemaItems.filter((itm) => itm.weekday === "SATURDAY").length})
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "SATURDAY")
          .sort((a, b) =>
            dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart))
          )
          .map(async (itm) => {
            // const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itm.course.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day6">
        <AccordionTrigger>
          Söndag ({schemaItems.filter((itm) => itm.weekday === "SUNDAY").length}
          )
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "SUNDAY")
          .sort((a, b) =>
            dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart))
          )
          .map((itm) => {
            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itm.course.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem> */}
    </Accordion>
  );
}
