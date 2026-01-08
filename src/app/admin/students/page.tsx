import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditParticipantForm from "@/components/EditParticipantForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAdminRole } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentsPage(props: {
  searchParams:
    | Promise<{ q?: string; termin?: string }>
    | { q?: string; termin?: string };
}) {
  const resolvedParams = (await props.searchParams) as {
    q?: string;
    termin?: string;
  };
  noStore();
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound();

  const query = (
    typeof resolvedParams?.q === "string" ? resolvedParams.q : ""
  ).toLowerCase();
  const terminId =
    typeof resolvedParams?.termin === "string"
      ? resolvedParams.termin
      : undefined;

  // Fetch participants linked to purchases
  // We want to see who is active in which classes
  const participants = await prisma.participant.findMany({
    where: {
      OR: query
        ? [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      addedBy: {
        include: { details: true },
      },
      purchases: {
        include: {
          product: {
            include: { termin: true },
          },
          PurchaseItems: {
            include: {
              course: true,
            },
          },
        },
        where: terminId
          ? {
              product: { terminId },
            }
          : undefined,
      },
    },
    orderBy: { name: "asc" },
  });

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Deltagarlista & Elever</h1>

        <form className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Sök namn..."
            className="w-full sm:w-64"
          />
          <select
            name="termin"
            defaultValue={terminId}
            className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Alla terminer</option>
            {terminer.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-brand text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-light transition-colors"
          >
            Filtrera
          </button>
        </form>
      </div>

      <div className="grid gap-4">
        {participants.filter((p) => !terminId || p.purchases.length > 0)
          .length === 0 ? (
          <p className="text-muted-foreground italic">
            Inga deltagare hittades.
          </p>
        ) : (
          participants.map((p) => {
            const activePurchases = p.purchases.filter(
              (pur) => pur.PurchaseItems.length > 0,
            );
            if (terminId && activePurchases.length === 0) return null;

            return (
              <Card
                key={p.id}
                className="overflow-hidden border-l-4 border-l-brand"
              >
                <CardHeader className="py-4 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                          {p.email && <span>{p.email}</span>}
                          {p.phone && <span>• {p.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <EditParticipantForm participant={p} />
                      {p.allowPhotoVideo ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase border border-emerald-500/20">
                          📸 Foto OK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold uppercase border border-amber-500/20">
                          🚫 Inga foton
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                        Anmälningar / Kurser
                      </h4>
                      {activePurchases.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground">
                          Inga aktiva kurser för valda filter.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activePurchases.flatMap((pur) =>
                            pur.PurchaseItems.map((item) => (
                              <div
                                key={item.id}
                                className="p-2 rounded border bg-card text-sm"
                              >
                                <div className="font-semibold truncate">
                                  {item.course.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground flex justify-between mt-1">
                                  <span>
                                    {pur.product.termin?.name || "Ingen termin"}
                                  </span>
                                  <span
                                    className={
                                      item.remainingCount > 0
                                        ? "text-brand"
                                        : "text-destructive"
                                    }
                                  >
                                    {item.remainingCount} lektioner kvar
                                  </span>
                                </div>
                              </div>
                            )),
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t text-[10px] text-muted-foreground flex justify-between items-center">
                      <span>
                        Anmäld av:{" "}
                        <span className="font-medium text-foreground">
                          {p.addedBy.name} ({p.addedBy.email})
                        </span>
                      </span>
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(p.name)}`}
                        className="text-brand hover:underline"
                      >
                        Visa orderhistorik →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
