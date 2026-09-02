import {
  CircleAlert,
  CircleCheck,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { getHealthIssues } from "@/lib/admin-health";

/**
 * Tyst trasig data — sådant som inte kraschar men gör att något beter sig fel
 * för kunden. Bara för admin: inget av det här är lärarens att laga.
 */
export async function HealthChecks() {
  const issues = await getHealthIssues();

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Stethoscope className="h-5 w-5 text-muted-foreground" />
        Felsökning
      </h2>

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
              <li key={issue.id}>
                <Link
                  href={`/admin/health/${issue.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <Icon
                    className={
                      serious
                        ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                        : "mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                    }
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">
                      <span className="tabular-nums">{issue.count}</span>{" "}
                      {issue.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {issue.description}
                    </div>
                    <div className="text-sm text-muted-foreground underline underline-offset-4">
                      Visa vilka
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Visas medan kontrollerna körs, så resten av översikten inte får vänta. */
export function HealthChecksSkeleton() {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Stethoscope className="h-5 w-5 text-muted-foreground" />
        Felsökning
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Kontrollerar…
      </div>
    </section>
  );
}
