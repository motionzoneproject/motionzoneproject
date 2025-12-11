import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import { dbToFormTime } from "@/lib/time-convert";

interface SchemaProps {
  schemaItems: SchemaItemWithCourse[];
}

export default function Schema({ schemaItems }: SchemaProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="day0">
        <AccordionTrigger>
          Måndag ({schemaItems.filter((itm) => itm.weekday === "MONDAY").length}
          )
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "MONDAY")
          .map(async (itm) => {
            // const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {dbToFormTime(itm.timeStart)}
                <br />
                {itm.course.name}
                <br />
                {dbToFormTime(itm.timeEnd)}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day1">
        <AccordionTrigger>
          Tisdag (
          {schemaItems.filter((itm) => itm.weekday === "TUESDAY").length})
        </AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "TUESDAY")
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
        {schemaItems.map((itm) => {
          return (
            <AccordionContent key={itm.id}>
              {itm.timeStart.toLocaleTimeString()}
              <br />
              {JSON.stringify(itm)}
              <br />
              {itm.timeStart.toLocaleTimeString()}
            </AccordionContent>
          );
        })}
      </AccordionItem>
    </Accordion>
  );
}
