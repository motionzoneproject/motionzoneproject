"use client";

import { InfoIcon, TriangleAlertIcon } from "lucide-react";

export type DeliveryShape = {
  clipcard: boolean;
  autobook: boolean;
  maxCourses: number | null;
  /** Antal kurser kopplade till produkten. null när det inte är känt (ny produkt). */
  courseCount: number | null;
};

/**
 * Översätter kombinationen klippkort / autobokning / kursbegränsning till en
 * mening om vad som faktiskt händer med kundens bokningar.
 *
 * De tre fälten är var för sig begripliga men säger ingenting tillsammans, och
 * en felställd kombination märks först när någon har köpt produkten. Ett paket
 * utan kursbegränsning och med autobokning på bokar t.ex. in varje köpare på
 * samtliga kopplade kurser, vilket nästan aldrig är meningen för terminskort
 * och program.
 */
export function describeDelivery({
  clipcard,
  autobook,
  maxCourses,
  courseCount,
}: DeliveryShape): { text: string; warning: string | null } {
  const kurser =
    courseCount === null
      ? "de kurser som kopplas till produkten"
      : courseCount === 1
        ? "kursen som är kopplad till produkten"
        : `de ${courseCount} kurser som är kopplade till produkten`;

  const emptyWarning =
    courseCount === 0
      ? "Inga kurser är kopplade till produkten. Köper någon den nu blir köpet tomt och kunden kan inte boka någonting alls."
      : null;

  if (clipcard) {
    const omfattning =
      maxCourses !== null
        ? `${maxCourses} ${maxCourses === 1 ? "kurs" : "kurser"} som kunden väljer i kassan`
        : kurser;
    return {
      text: `Klippkortet ger kunden ett saldo att boka enskilda lektioner med, i ${omfattning}. Ingen autobokning sker — klippen dras när en lektion bokas.`,
      warning: emptyWarning,
    };
  }

  if (maxCourses !== null) {
    const val = `Kunden väljer ${maxCourses} ${maxCourses === 1 ? "kurs" : "kurser"} i kassan ur ${kurser}`;
    return autobook
      ? {
          text: `${val}, och bokas in på alla lektioner i dem när ordern godkänns.`,
          warning: emptyWarning,
        }
      : {
          text: `${val}, men bokas inte in automatiskt. Kunden bokar in sig själv på profilsidan, eller så bokar ni in hen under Elever.`,
          warning: emptyWarning,
        };
  }

  if (autobook) {
    return {
      text: `Kunden bokas in på alla lektioner i ${kurser} när ordern godkänns.`,
      warning:
        emptyWarning ??
        (courseCount !== null && courseCount > 2
          ? `Varje köpare bokas alltså in på samtliga ${courseCount} kurser. Är det här ett terminskort eller ett program där kunden bara går några av kurserna ska autobokningen vara avstängd — annars fylls elevens schema med kurser hen aldrig tänkt gå.`
          : null),
    };
  }

  return {
    text: `Kunden får tillgång till ${kurser} men bokas inte in automatiskt. Kunden bokar in sig på en hel kurs i taget på sin profilsida, eller så sätter ni ihop schemat åt hen under Elever. Så fungerar terminskort och program.`,
    warning: emptyWarning,
  };
}

/** Visar describeDelivery() som en ruta i produktformuläret. */
export function DeliverySummary(props: DeliveryShape) {
  const { text, warning } = describeDelivery(props);

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <InfoIcon className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <strong className="block mb-1 font-medium text-foreground">
            Så funkar produkten för kunden
          </strong>
          {text}
        </span>
      </div>

      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
          <TriangleAlertIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}
