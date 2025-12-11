import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SchemaItem } from "@/generated/prisma/client";
import { getCourseById } from "@/lib/actions/admin";

interface SchemaProps {
  schemaItems: SchemaItem[];
}

export default function Schema({ schemaItems }: SchemaProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="day0">
        <AccordionTrigger>Måndag</AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "MONDAY")
          .map(async (itm) => {
            const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itmCourse?.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day1">
        <AccordionTrigger>Tisdag</AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "TUESDAY")
          .map(async (itm) => {
            const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itmCourse?.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day2">
        <AccordionTrigger>Onsdag</AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "WEDNESDAY")
          .map(async (itm) => {
            const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itmCourse?.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day3">
        <AccordionTrigger>Torsdag</AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "THURSDAY")
          .map(async (itm) => {
            const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itmCourse?.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day4">
        <AccordionTrigger>Fredag</AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "FRIDAY")
          .map(async (itm) => {
            const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itmCourse?.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day5">
        <AccordionTrigger>Lördag</AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "SATURDAY")
          .map(async (itm) => {
            const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itmCourse?.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
      <AccordionItem value="day6">
        <AccordionTrigger>Söndag</AccordionTrigger>
        {schemaItems
          .filter((itm) => itm.weekday === "SUNDAY")
          .map(async (itm) => {
            const itmCourse = await getCourseById(itm.id);

            return (
              <AccordionContent key={itm.id}>
                {itm.timeStart.toLocaleTimeString()}
                <br />
                {itmCourse?.name}
                <br />
                {itm.timeStart.toLocaleTimeString()}
              </AccordionContent>
            );
          })}
      </AccordionItem>
    </Accordion>
  );
}
