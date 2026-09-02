"use client";

import {
  CircleAlert,
  CircleCheck,
  Info,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { runHealthChecks } from "@/lib/actions/health-actions";
import type { HealthCheckInfo, HealthIssue } from "@/lib/admin-health";
import { FixDialog } from "../../health/[id]/FixDialog";
import { HowToFix } from "./HowToFix";

/** Fler än så i översikten blir en vägg av knappar — resten på detaljsidan. */
const INLINE_FIX_LIMIT = 3;

interface Props {
  /** Alla kontroller, för "Vad testas?" — hämtas server-side, kräver ingen körning. */
  info: HealthCheckInfo[];
}

/**
 * Tyst trasig data — sådant som inte kraschar men gör att något beter sig fel
 * för kunden. Bara för admin: inget av det här är lärarens att laga.
 *
 * Kontrollerna körs på knapptryck, inte vid sidladdning. Det är ett tjugotal
 * frågor och man letar fel ibland, inte varje gång man öppnar översikten.
 */
export function HealthChecks({ info }: Props) {
  const [issues, setIssues] = useState<HealthIssue[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await runHealthChecks();
      if (result.success) {
        setIssues(result.issues);
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Stethoscope className="h-5 w-5 text-muted-foreground" />
          Felsökning
        </h2>
        <WhatIsChecked info={info} />
      </div>

      {issues === null && !isPending && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Söker igenom {info.length} kända felkällor i datan — köp utan
            tillgång, dubbletter, bokningar som inte stämmer.
          </p>
          <Button className="mt-3" onClick={run}>
            Kör felsökning
          </Button>
        </div>
      )}

      {isPending && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-6">
          <Loader />
          <p className="text-center text-sm text-muted-foreground">
            Kör {info.length} kontroller…
          </p>
        </div>
      )}

      {issues !== null && !isPending && (
        <>
          {issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Inga problem hittade.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {issues.map((issue) => {
                const serious = issue.severity === "serious";
                const Icon = serious ? TriangleAlert : CircleAlert;

                return (
                  // Knappen kan inte ligga inuti länken — en <button> i en
                  // <a> är ogiltig och skulle navigera i stället för att
                  // öppna dialogen. Därför är raden en behållare med länken
                  // och knapparna som syskon.
                  <li
                    key={issue.id}
                    className="flex flex-wrap items-start gap-3 px-4 py-3"
                  >
                    <Icon
                      className={
                        serious
                          ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                          : "mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                      }
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-medium">
                        <span className="tabular-nums">{issue.count}</span>{" "}
                        {issue.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {issue.description}
                      </div>
                      <Link
                        href={`/admin/health/${issue.id}`}
                        className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
                        Visa problemet
                      </Link>

                      <div className="pt-2">
                        <HowToFix howTo={issue.howTo} compact />
                      </div>
                    </div>

                    {issue.fixes.length > 0 && (
                      <div className="flex flex-col items-stretch gap-2">
                        {issue.fixes
                          .slice(0, INLINE_FIX_LIMIT)
                          .map(
                            (row) =>
                              row.fix && (
                                <FixDialog
                                  key={row.id}
                                  fix={row.fix}
                                  label={
                                    issue.fixes.length > 1
                                      ? `Åtgärda: ${row.title}`
                                      : "Åtgärda"
                                  }
                                  onFixed={run}
                                />
                              ),
                          )}
                        {issue.fixes.length > INLINE_FIX_LIMIT && (
                          <Link
                            href={`/admin/health/${issue.id}`}
                            className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                          >
                            +{issue.fixes.length - INLINE_FIX_LIMIT} till
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Button variant="outline" size="sm" onClick={run}>
            Kör igen
          </Button>
        </>
      )}
    </section>
  );
}

/** Förklarar vad felsökningen letar efter, så ett tomt resultat går att lita på. */
function WhatIsChecked({ info }: Props) {
  const serious = info.filter((check) => check.severity === "serious");
  const warnings = info.filter((check) => check.severity === "warning");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="h-4 w-4" />
          Vad testas?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vad felsökningen letar efter</DialogTitle>
          <DialogDescription>
            {info.length} kontroller mot databasen. Alla läser bara — ingenting
            ändras av att köra dem.
          </DialogDescription>
        </DialogHeader>

        <CheckGroup
          title="Allvarligt"
          note="Data är faktiskt fel, ofta med en kund som drabbats."
          checks={serious}
        />
        <CheckGroup
          title="Varning"
          note="Konfiguration som gör att något inte beter sig som avsett."
          checks={warnings}
        />
      </DialogContent>
    </Dialog>
  );
}

function CheckGroup({
  title,
  note,
  checks,
}: {
  title: string;
  note: string;
  checks: HealthCheckInfo[];
}) {
  if (checks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div>
        <h3 className="font-semibold">
          {title}{" "}
          <span className="font-normal text-muted-foreground">
            ({checks.length})
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <ul className="space-y-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className="rounded-lg border border-border p-3 text-sm"
          >
            <div className="font-medium first-letter:uppercase">
              {check.label}
            </div>
            <div className="mb-2 text-muted-foreground">
              {check.description}
            </div>
            <HowToFix howTo={check.howTo} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}
