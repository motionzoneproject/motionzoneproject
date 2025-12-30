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
    <Card>
      <CardHeader>
        <CardTitle>{user?.name} - Profilsida</CardTitle>
        <CardDescription>
          Boka lektioner och hantera dina köpta produkter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BookingCal
          purschaseItems={purschaseItems}
          lessons={lessons}
          bookings={bookings}
        />

        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Dina köpta paket & produkter
          </h3>

          <Accordion type="single" collapsible className="space-y-2">
            {Object.entries(groupedPurchases).map(
              async ([purchaseId, group]) => (
                <AccordionItem
                  key={purchaseId}
                  value={purchaseId}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex flex-1 items-center justify-between text-left pr-4">
                      <div>
                        <span className="text-xs text-brand">
                          Produkt / Paket
                        </span>
                        <p className="font-medium">{group.productName}</p>
                      </div>
                      <Badge variant="outline">
                        {group.items.length}{" "}
                        {group.items.length === 1 ? "kurs" : "kurser"}
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="border-t pt-4 pb-2">
                    <div className="space-y-3">
                      {group.items.map(async (pi) => {
                        const courseName = await getFullCourseNameFromId(
                          pi.courseId,
                        );
                        const isLow = !pi.unlimited && pi.remainingCount <= 1;

                        return (
                          <div
                            key={pi.id}
                            className="flex items-start justify-between bg-muted p-3 rounded border"
                          >
                            <div className="space-y-1">
                              <p className="font-medium text-sm">
                                {courseName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Dina bokningar:
                              </p>
                              {bookings.filter(
                                (b) => b.purchaseItemId === pi.id,
                              ).length > 0 ? (
                                <ul className="space-y-1 mt-1">
                                  {bookings
                                    .filter((b) => b.purchaseItemId === pi.id)
                                    .map((b) => (
                                      <li
                                        key={b.id}
                                        className="text-xs bg-background p-2 rounded"
                                      >
                                        {new Date(
                                          b.lesson.startTime,
                                        ).toLocaleDateString("sv-SE", {
                                          day: "numeric",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                        {b.lesson.cancelled && (
                                          <span className="text-destructive ml-1">
                                            (inställd)
                                          </span>
                                        )}
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
                              <span
                                className={`text-lg font-bold ${
                                  isLow ? "text-destructive" : ""
                                }`}
                              >
                                {pi.unlimited ? "∞" : pi.remainingCount}
                              </span>
                              {!pi.unlimited && (
                                <span className="text-xs text-muted-foreground">
                                  {" "}
                                  / {pi.lessonsIncluded}
                                </span>
                              )}
                              <p className="text-xs text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
