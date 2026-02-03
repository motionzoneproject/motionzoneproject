import { Clock, Users } from "lucide-react";
import EditParticipantForm from "@/components/EditParticipantForm";
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
import { getUserOrders } from "@/lib/actions/orders";
import { getMyParticipants } from "@/lib/actions/participants";
import { calcRemainingCount } from "@/lib/actions/purchase-helpers";
import {
  getUserBookings,
  getUserLessons,
  getUserPendingRegistrations,
  getUserPurchases,
  type UserPurchaseWithProduct,
} from "@/lib/actions/server-actions";
import { getSessionData } from "@/lib/actions/sessiondata";
import prisma from "@/lib/prisma";
import BookingCal from "./BookingCal";
import OrderHistory from "./OrderHistory";

export default async function Page() {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  const userDetails = user
    ? await prisma.userDetails.findUnique({ where: { userId: user.id } })
    : null;

  const { lessons = [] } = await getUserLessons();
  const { bookings = [] } = await getUserBookings();
  const purschaseItems: UserPurchaseWithProduct[] = await getUserPurchases();
  const pendingRegistrations = await getUserPendingRegistrations();
  const myParticipants = await getMyParticipants();
  const orders = await getUserOrders();

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
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{user?.name} - Profilsida</CardTitle>
            <CardDescription>
              Boka lektioner och hantera dina köpta produkter.
            </CardDescription>
          </div>
          {userDetails && (
            <div className="text-right">
              <Badge
                variant={userDetails.allowPhotoVideo ? "default" : "outline"}
                className={
                  userDetails.allowPhotoVideo
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : ""
                }
              >
                {userDetails.allowPhotoVideo
                  ? "📸 Foto/Video OK"
                  : "🚫 Inga foton/videos"}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {userDetails && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Kontaktuppgifter
              </p>
              <p className="text-sm mt-1">
                <span className="font-semibold">Telefon:</span>{" "}
                {userDetails.phoneNumber || "Ej angivet"}
              </p>
              <p className="text-sm">
                <span className="font-semibold">E-post:</span> {user?.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Adress
              </p>
              <p className="text-sm mt-1">
                {userDetails.address || "Ej angiven adress"}
              </p>
              <p className="text-sm">
                {userDetails.postalCode} {userDetails.city}
              </p>
            </div>
          </div>
        )}

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
            {Object.entries(groupedPurchases).map(([purchaseId, group]) => (
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
                    {group.items.map((pi) => {
                      const courseName = pi.course.name;
                      const remaining = calcRemainingCount({
                        purchase: pi.purchase,
                        purchaseItem: pi,
                      });
                      const isLow =
                        Number.isFinite(remaining) && remaining <= 1;
                      const totalForDisplay =
                        pi.purchase.type === "CLIP"
                          ? pi.purchase.totalCount
                          : pi.lessonsIncluded;

                      return (
                        <div
                          key={pi.id}
                          className="flex items-start justify-between bg-muted p-3 rounded border"
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{courseName}</p>
                            {pi.purchase.participant &&
                              pi.purchase.participant.name !== user?.name && (
                                <p className="text-[10px] text-brand font-medium">
                                  Deltagare: {pi.purchase.participant.name}
                                </p>
                              )}
                            <p className="text-muted-foreground text-xs">
                              Dina bokningar:
                            </p>
                            {bookings.filter((b) => b.purchaseItemId === pi.id)
                              .length > 0 ? (
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
                              {remaining === Infinity ? "∞" : remaining}
                            </span>
                            {remaining !== Infinity &&
                              totalForDisplay != null && (
                                <span className="text-xs text-muted-foreground">
                                  {" "}
                                  / {totalForDisplay}
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
            ))}
          </Accordion>
        </div>

        {myParticipants.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Sparade deltagare (t.ex. barn)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myParticipants.map((p) => (
                <div
                  key={p.id}
                  className="p-3 border rounded-lg bg-muted/20 flex justify-between items-center group"
                >
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    {p.email && (
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {p.allowPhotoVideo ? (
                        <span className="text-[9px] text-emerald-600 font-bold uppercase">
                          📸 Foto OK
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-600 font-bold uppercase">
                          🚫 Inga foton
                        </span>
                      )}
                    </div>
                  </div>
                  <EditParticipantForm participant={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingRegistrations.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Väntande anmälningar
            </h3>
            <div className="space-y-2">
              {pendingRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-4 border rounded-lg bg-amber-500/5 border-amber-500/20 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-sm">{reg.product.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status:{" "}
                      <span className="text-amber-600 font-medium">
                        Väntar på betalning / godkännande
                      </span>
                    </p>
                    {reg.participant && reg.participant.name !== user?.name && (
                      <p className="text-[10px] text-brand mt-1 uppercase font-bold">
                        Deltagare: {reg.participant.name}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-600/20"
                  >
                    Behandlas
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <OrderHistory orders={orders} />
      </CardContent>
    </Card>
  );
}
