import { CircleAlert, Wrench } from "lucide-react";
import type { HealthHowTo } from "@/lib/admin-health";

/**
 * Så här lagar du det. Stegen namnger knappar som faktiskt finns i
 * gränssnittet — där det inte går att laga står det rakt ut i stället för att
 * skicka admin på en rundtur som inte leder någonstans.
 */
export function HowToFix({
  howTo,
  compact = false,
}: {
  howTo: HealthHowTo;
  /** Mindre rubrik och text, för listan i översikten. */
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-border bg-muted/30 p-3"
          : "rounded-xl border border-border bg-muted/30 p-4"
      }
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        Så åtgärdar du
        {howTo.noUiPath && (
          <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-xs font-normal text-amber-600 dark:text-amber-400">
            Ingen knapp finns
          </span>
        )}
      </div>

      <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
        {howTo.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {howTo.caveat && (
        <p className="mt-2 flex gap-2 text-sm text-amber-600 dark:text-amber-400">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {howTo.caveat}
        </p>
      )}
    </div>
  );
}
