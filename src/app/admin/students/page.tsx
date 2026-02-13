import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditParticipantForm from "@/components/EditParticipantForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAdminRole } from "@/lib/actions/admin";
import { calcRemainingCount } from "@/lib/actions/purchase-helpers";
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
    course?: string;
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
  const courseId =
    typeof resolvedParams?.course === "string"
      ? resolvedParams.course
      : undefined;

  // Fetch participants and filter purchases by course and term via schemaItems
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
          product: true,
          PurchaseItems: {
            include: {
              course: {
                include: {
                  schemaItems: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Get all terms for filter dropdown
  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });
  // Get all courses for filter dropdown
  const courses = await prisma.course.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
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
            aria-label="Välj termin"
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
          <select
            name="course"
            aria-label="Välj kurs"
            defaultValue={courseId}
            className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Alla kurser</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
        {participants.filter((p) => {
          // Filter purchases by selected term and course via schemaItems
          const filteredPurchases = p.purchases.filter((pur) =>
            pur.PurchaseItems.some((item) => {
              const matchesTerm =
                !terminId ||
                item.course.schemaItems.some((si) => si.terminId === terminId);
              const matchesCourse = !courseId || item.course.id === courseId;
              return matchesTerm && matchesCourse;
            }),
          );
          return filteredPurchases.length > 0;
        }).length === 0 ? (
          <p className="text-muted-foreground italic">
            Inga deltagare hittades.
          </p>
        ) : (
          participants.map((p) => {
            // Filter purchases by selected term and course via schemaItems
            const activePurchases = p.purchases.filter((pur) =>
              pur.PurchaseItems.some((item) => {
                const matchesTerm =
                  !terminId ||
                  item.course.schemaItems.some(
                    (si) => si.terminId === terminId,
                  );
                const matchesCourse = !courseId || item.course.id === courseId;
                return matchesTerm && matchesCourse;
              }),
            );
            // Only show participant if they have active purchases for the selected filters
            if (activePurchases.length === 0) return null;

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
                            pur.PurchaseItems.map((item) => {
                              const remaining = calcRemainingCount({
                                purchase: pur,
                                purchaseItem: item,
                              });
                              // Find relevant term(s) for this course
                              const courseTerms = item.course.schemaItems
                                .map(
                                  (si) =>
                                    terminer.find((t) => t.id === si.terminId)
                                      ?.name,
                                )
                                .filter(Boolean);
                              // Product info
                              const productName = pur.product?.name;
                              return (
                                <div
                                  key={item.id}
                                  className="p-2 rounded border bg-card text-sm"
                                >
                                  <div className="font-semibold truncate">
                                    {item.course.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex flex-col mt-1">
                                    <span>
                                      {terminId
                                        ? terminer.find(
                                            (t) => t.id === terminId,
                                          )?.name || "Vald termin"
                                        : courseTerms.join(", ") ||
                                          "Ingen termin"}
                                    </span>
                                    {productName && (
                                      <span className="italic">
                                        Produkt: {productName}
                                      </span>
                                    )}
                                    <span
                                      className={
                                        remaining === Infinity || remaining > 0
                                          ? "text-brand"
                                          : "text-destructive"
                                      }
                                    >
                                      {remaining === Infinity ? "∞" : remaining}{" "}
                                      lektioner kvar
                                    </span>
                                  </div>
                                  {/* Show orderer if different from participant */}
                                  {p.addedBy && p.email !== p.addedBy.email && (
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                      Beställd av:{" "}
                                      <span className="font-medium text-foreground">
                                        {p.addedBy.name} ({p.addedBy.email})
                                      </span>
                                    </div>
                                  )}
                                  {p.addedBy && p.email === p.addedBy.email && (
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                      Självbeställare
                                    </div>
                                  )}
                                </div>
                              );
                            }),
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
