import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Termin } from "@/generated/prisma/client";

interface Props {
  termin: Termin;
}

export default function TerminItem({ termin }: Props) {
  return (
    <div className="p-2 border rounded">
      <Card>
        <CardHeader>
          <CardTitle>{termin.name}</CardTitle>
        </CardHeader>

        <CardContent>
          <CardDescription>
            Start: {termin.startDate.toLocaleDateString()}
            <br />
            Slut: {termin.endDate.toLocaleDateString()}
          </CardDescription>
          <CardAction>
            <Button variant={"default"}>Ändra</Button>
          </CardAction>
          <span className="font-bold">Veckoschema:</span>
          <Accordion type="single" collapsible>
            <AccordionItem value="day0">
              <AccordionTrigger>Måndag</AccordionTrigger>
              <AccordionContent>Inga kurser.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="day1">
              <AccordionTrigger>Tisdag</AccordionTrigger>
              <AccordionContent>Inga kurser.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="day2">
              <AccordionTrigger>Onsdag</AccordionTrigger>
              <AccordionContent>Inga kurser.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="day3">
              <AccordionTrigger>Torsdag</AccordionTrigger>
              <AccordionContent>Inga kurser.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="day4">
              <AccordionTrigger>Fredag</AccordionTrigger>
              <AccordionContent>Inga kurser.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="day5">
              <AccordionTrigger>Lördag</AccordionTrigger>
              <AccordionContent>Inga kurser.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="day6">
              <AccordionTrigger>Söndag</AccordionTrigger>
              <AccordionContent>Inga kurser.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
