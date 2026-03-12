import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditParticipantForm from "@/components/EditParticipantForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  Course,
  Participant,
  Prisma,
  User,
  UserDetails,
} from "@/generated/prisma/client";
import { isAdminRole } from "@/lib/actions/admin";
import { calcRemainingCount } from "@/lib/actions/purchase-helpers";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";

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

  // Gammal aproach:
  // // Fetch participants and filter purchases by course and term via schemaItems
  // const participants = await prisma.participant.findMany({
  //   where: {
  //     OR: query
  //       ? [
  //           { name: { contains: query, mode: "insensitive" } },
  //           { email: { contains: query, mode: "insensitive" } },
  //         ]
  //       : undefined,
  //   },
  //   include: {
  //     addedBy: {
  //       include: { details: true },
  //     },
  //     purchases: {
  //       include: {
  //         product: true,
  //         PurchaseItems: {
  //           include: {
  //             course: {
  //               include: {
  //                 schemaItems: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  //   orderBy: { name: "asc" },
  // });

  // Nyt approach, för att få med både user och participants som elever.
  // Jag behöver hämta purchases, och göra en lista baserat på det istället, för här får vi bara participants inte users.

  const purchasesWithData = await prisma.purchase.findMany({
    include: {
      product: true,
      PurchaseItems: {
        include: { course: { include: { schemaItems: true } } },
      },
      user: { include: { details: true } },
      participant: { include: { addedBy: true } },
    },
  });

  // För då kan vi visa eleven dels om det är en participant eller en kund.
  // Om participant: (om participantData inte är null)

  type AddedBy =
    | {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        emailVerified: boolean;
        image: string | null;
        role: string | null;
        banned: boolean | null;
        banReason: string | null;
        banExpires: Date | null;
      }
    | undefined;

  type PurchaseWithItems = Prisma.PurchaseGetPayload<{
    include: {
      product: true;
      PurchaseItems: {
        include: {
          course: { include: { schemaItems: true } };
        };
      };
      participant: { include: { addedBy: true } };
      user: { include: { details: true } };
    };
  }>;

  type Student = {
    user: User;
    details: UserDetails | null;
    purchaseData: PurchaseWithItems[];
    courses: Course[];
    terminerIds: string[];
    participantData: {
      participant: Participant | null;
      addedBy: AddedBy;
    } | null;
  };

  // För att göra detta behöver vi vända på det och bygga en lista med unika "elever", och spara index för just den pur. Sedan köra igenom den och spara den som student.

  const mapStudents = new Map<string, Student>(); // Kan väl spara varje pur.user.id // Eller particiapant.id här, och dess Student som value?

  for (const pur of purchasesWithData) {
    const studentKey = pur.participantId
      ? `participant:${pur.participantId}`
      : `user:${pur.userId}`;

    let existing = mapStudents.get(studentKey);
    if (!existing) {
      existing = {
        user: pur.user,
        details: pur.user.details,
        purchaseData: [],
        courses: [],
        terminerIds: [],
        participantData: pur.participant
          ? {
              participant: pur.participant,
              addedBy: pur.participant?.addedBy,
            }
          : null,
      };
      mapStudents.set(studentKey, existing);
    }

    existing.purchaseData.push(pur);
  }

  const students = Array.from(mapStudents.values()).map((s) => {
    const courseMap = new Map<string, Course>();
    const terminIdSet = new Set<string>();

    for (const pur of s.purchaseData) {
      pur.PurchaseItems.forEach((pui) => {
        courseMap.set(pui.course.id, pui.course);
        pui.course.schemaItems.forEach((si) => {
          terminIdSet.add(si.terminId);
        });
      });
    }

    return {
      ...s,
      courses: Array.from(courseMap.values()),
      terminerIds: Array.from(terminIdSet),
    };
  });

  // Sen ändrar vi på hur vi visar datan..

  // Get all terms for filter dropdown
  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });

  // Get all courses for filter dropdown
  const courses = await prisma.course.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const matchesQuery = (s: Student) => {
    if (!query) return true;
    const participant = s.participantData?.participant ?? null;
    const haystack = (
      participant
        ? [participant.name, participant.email, participant.phone]
        : [s.user.name, s.user.email, s.details?.phoneNumber]
    )
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  };

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
            {courses.map(async (c) => (
              <option key={c.id} value={c.id}>
                {await getFullCourseNameFromId(c.id)}
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
        {(() => {
          const filteredStudents = students.filter((s) => {
            if (!matchesQuery(s)) return false;
            const filteredPurchases = s.purchaseData.filter((pur) =>
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
            return filteredPurchases.length > 0;
          });

          if (filteredStudents.length === 0) {
            return (
              <p className="text-muted-foreground italic">
                Inga deltagare hittades.
              </p>
            );
          }

          return filteredStudents.map((s) => {
            const participant = s.participantData?.participant ?? null;
            const addedBy = s.participantData?.addedBy;
            const displayName =
              participant?.name ?? s.user.name ?? "Okänd elev";
            const email = participant?.email ?? s.user.email ?? "";
            const phone = participant?.phone ?? s.details?.phoneNumber ?? "";
            const studentKey = participant?.id ?? s.user.id;
            const studentTermNames = s.terminerIds
              .map((id) => terminer.find((t) => t.id === id)?.name)
              .filter((name): name is string => Boolean(name));

            const activePurchaseData = s.purchaseData
              .map((pur) => ({
                purchase: pur,
                purchaseItems: pur.PurchaseItems.filter((item) => {
                  const matchesTerm =
                    !terminId ||
                    item.course.schemaItems.some(
                      (si) => si.terminId === terminId,
                    );
                  const matchesCourse =
                    !courseId || item.course.id === courseId;
                  return matchesTerm && matchesCourse;
                }),
              }))
              .filter((pur) => pur.purchaseItems.length > 0);

            if (activePurchaseData.length === 0) return null;

            return (
              <Card
                key={studentKey}
                className="overflow-hidden border-l-4 border-l-brand"
              >
                <CardHeader className="py-4 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{displayName}</CardTitle>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                          {email && <span>{email}</span>}
                          {phone && <span>• {phone}</span>}
                        </div>
                        {studentTermNames.length > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Terminer: {studentTermNames.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {participant && (
                        <>
                          <EditParticipantForm participant={participant} />
                          {participant.allowPhotoVideo ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase border border-emerald-500/20">
                              📸 Foto OK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold uppercase border border-amber-500/20">
                              🚫 Inga foton
                            </span>
                          )}
                        </>
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
                      {activePurchaseData.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground">
                          Inga aktiva kurser för valda filter.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activePurchaseData.flatMap(
                            ({ purchase, purchaseItems }) =>
                              purchaseItems.map((item) => {
                                const remaining = calcRemainingCount({
                                  purchase: purchase,
                                  purchaseItem: item,
                                });

                                // Find relevant term(s) for this course
                                const courseTerms = [
                                  ...new Set(
                                    item.course.schemaItems.map(
                                      (si) => si.terminId,
                                    ),
                                  ),
                                ]
                                  .map(
                                    (id) =>
                                      terminer.find((t) => t.id === id)?.name,
                                  )
                                  .filter((name): name is string =>
                                    Boolean(name),
                                  );
                                // Product info
                                const productName = purchase.product?.name;
                                return (
                                  <div
                                    key={item.id}
                                    className="p-2 rounded border bg-card text-sm"
                                  >
                                    <div className="font-semibold truncate">
                                      {getCourseName(item.course)}
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
                                          remaining === Infinity ||
                                          remaining > 0
                                            ? "text-brand"
                                            : "text-destructive"
                                        }
                                      >
                                        {remaining === Infinity
                                          ? "∞"
                                          : remaining}{" "}
                                        lektioner kvar
                                      </span>
                                    </div>
                                    {/* Show orderer if different from participant */}
                                    {addedBy &&
                                      email &&
                                      email !== addedBy.email && (
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                          Beställd av:{" "}
                                          <span className="font-medium text-foreground">
                                            {addedBy.name} ({addedBy.email})
                                          </span>
                                        </div>
                                      )}
                                    {addedBy &&
                                      email &&
                                      email === addedBy.email && (
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
                      {addedBy ? (
                        <span>
                          Anmäld av:{" "}
                          <span className="font-medium text-foreground">
                            {addedBy.name} ({addedBy.email})
                          </span>
                        </span>
                      ) : (
                        <span>
                          Kund:{" "}
                          <span className="font-medium text-foreground">
                            {displayName}
                          </span>
                        </span>
                      )}
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(displayName)}`}
                        className="text-brand hover:underline"
                      >
                        Visa orderhistorik →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          });
        })()}
      </div>
    </div>
  );
}
