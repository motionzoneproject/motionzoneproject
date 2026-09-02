import { ArrowLeft, CircleAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/actions/admin";
import { getHealthDetail, HEALTH_ROW_LIMIT } from "@/lib/admin-health";
import { HowToFix } from "../../components/overview/HowToFix";
import { FixDialog } from "./FixDialog";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Detaljvy för en felsökningskontroll: vilka poster det faktiskt gäller.
 * Admin-only — lärare har inget av det här att laga.
 */
export default async function Page({ params }: Props) {
  await requireAdmin();

  const { id } = await params;
  const detail = await getHealthDetail(id);
  if (!detail) notFound();

  const serious = detail.severity === "serious";
  const Icon = serious ? TriangleAlert : CircleAlert;

  return (
    <div className="space-y-6 p-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Till översikten
      </Link>

      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Icon
            className={
              serious
                ? "h-6 w-6 shrink-0 text-destructive"
                : "h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400"
            }
          />
          <span className="first-letter:uppercase">
            {detail.rows.length} {detail.label}
          </span>
        </h1>
        <p className="text-muted-foreground">{detail.description}</p>
      </div>

      <HowToFix howTo={detail.howTo} />

      {detail.rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Inget att visa — det här är åtgärdat.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {detail.rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-medium">{row.title}</div>
                {row.detail && (
                  <div className="text-sm text-muted-foreground">
                    {row.detail}
                  </div>
                )}
              </div>
              {row.fix && <FixDialog fix={row.fix} />}
            </li>
          ))}
        </ul>
      )}

      {detail.truncated && (
        <p className="text-sm text-muted-foreground">
          Visar de {HEALTH_ROW_LIMIT} första. Det finns fler.
        </p>
      )}

      <Button asChild>
        <Link href={detail.fixHref}>{detail.fixLabel}</Link>
      </Button>
    </div>
  );
}
