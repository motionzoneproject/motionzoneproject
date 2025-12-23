import { redirect } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getFullCourseNameFromId,
  getUserBookings,
  getUserLessons,
  getUserPurchases,
  type UserPurchaseWithProduct,
} from "@/lib/actions/server-actions";
import { getSessionData } from "@/lib/actions/sessiondata";
import BookingCal from "./BookingCal";

export default async function Page() {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (user?.role === "admin") redirect("/admin");

  const { lessons = [] } = await getUserLessons();
  const { bookings = [] } = await getUserBookings();
  const purschaseItems: UserPurchaseWithProduct[] = await getUserPurchases();

  const groupedPurchases = purschaseItems.reduce(
    (acc, item) => {
      const purchaseId = item.purchaseId;
      if (!acc[purchaseId]) {
        acc[purchaseId] = {
          productName: item.purchase.product.name,
          items: [],
        };
      }
      acc[purchaseId].items.push(item);
      return acc;
    },
    {} as Record<string, { productName: string; items: typeof purschaseItems }>,
  );

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>{user?.name} - Profilsida</CardTitle>
          <CardDescription>
            Här kan du boka lektioner från dina köpta produkter, och ändra dina
            uppgifter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingCal
            purschaseItems={purschaseItems}
            lessons={lessons}
            bookings={bookings}
          />
          <br />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-tight">
              Dina köpta paket & produkter
            </h3>

            <Accordion type="single" collapsible className="w-full space-y-3">
              {Object.entries(groupedPurchases).map(
                async ([purchaseId, group]) => (
                  <AccordionItem
                    key={purchaseId}
                    value={purchaseId}
                    className="border rounded-xl bg-card shadow-sm overflow-hidden px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex flex-1 items-center justify-between text-left pr-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                            Produkt / Paket
                          </span>
                          <span className="font-bold text-lg leading-tight">
                            {group.productName}
                          </span>
                        </div>
                        <Badge variant="outline">
                          {group.items.length}{" "}
                          {group.items.length === 1 ? "kurs" : "kurser"}
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="border-t pt-4 pb-2">
                      <div className="space-y-4">
                        {group.items.map(async (pi) => {
                          const courseName = await getFullCourseNameFromId(
                            pi.courseId,
                          );
                          const isLow = !pi.unlimited && pi.remainingCount <= 1;

                          return (
                            <div
                              key={pi.id}
                              className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border"
                            >
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">
                                  {courseName}
                                </p>
                                <span className="mb-3">Dina bokningar:</span>{" "}
                                <br />
                                {bookings.filter(
                                  (b) => b.purchaseItemId === pi.id,
                                ).length > 0 ? (
                                  <ul className="grid gap-2">
                                    {bookings
                                      .filter((b) => b.purchaseItemId === pi.id)
                                      .map((b) => (
                                        <li
                                          key={b.id}
                                          className="hover:bg-accent hover:text-accent-foreground p-2 rounded"
                                        >
                                          <span className="font-medium">
                                            {new Date(
                                              b.lesson.startTime,
                                            ).toLocaleDateString("sv-SE", {
                                              day: "numeric",
                                              month: "short",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>{" "}
                                          <br />
                                          <span className="text-[10px] text-muted-foreground">
                                            {b.lesson.message}{" "}
                                            {b.lesson.cancelled && "(inställd)"}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">
                                    Inga bokningar gjorda än.
                                  </p>
                                )}
                              </div>

                              <div className="text-right">
                                <div className="flex items-baseline gap-1">
                                  <span
                                    className={`text-base font-black ${
                                      isLow
                                        ? "text-destructive"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {pi.unlimited ? "∞" : pi.remainingCount}
                                  </span>
                                  {!pi.unlimited && (
                                    <span className="text-[10px] text-muted-foreground uppercase">
                                      / {pi.lessonsIncluded} kvar
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] uppercase font-bold text-muted-foreground/60">
                                  Lektioner
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ),
              )}
            </Accordion>
          </div>

          {/**För att studera datan: */}
          {/* 
          <br />
          <br />
          purchaseItems:
          <br />
          <pre>{JSON.stringify(purschaseItems, null, 2)}</pre>
          <br />
          <br />
          <br />
          lessons:
          <br />
          <pre>{JSON.stringify(lessons, null, 2)}</pre>
          <br />
          <br />
          <br />
          bookings:
          <br />
          <pre>{JSON.stringify(bookings, null, 2)}</pre>
          <br />
          <br /> */}
        </CardContent>
      </Card>
    </div>
  );
}
