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
import {
  getUserBookings,
  getUserLessons,
  getUserPendingRegistrations,
  getUserPurchases,
  type UserPurchaseWithProduct,
} from "@/lib/actions/server-actions";
import { getSessionData } from "@/lib/actions/sessiondata";
import prisma from "@/lib/prisma";
import AutoBookBtn from "./AutoBookBtn";
import BookingCal from "./BookingCal";
import CancelBookingBtn from "./CancelBookingBtn";
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

  // Grupperar köp per purchaseId så varje accordion visar produktnamn,
  // ev. deltagare och alla tillhörande items/bokningar.
  const groupedPurchases = purschaseItems.reduce(
    (acc, item) => {
      // Initiera grupp vid första träffen.
      const purchaseId = item.purchaseId;
      if (!acc[purchaseId]) {
        acc[purchaseId] = {
          productName: item.purchase.product.name,
          participantName: item.purchase.participant?.name,
          items: [],
        };
      }
      // Spara deltagarnamn när vi hittar ett för köpet.
      if (!acc[purchaseId].participantName && item.purchase.participant?.name) {
        acc[purchaseId].participantName = item.purchase.participant.name;
      }
      // Lägg till item i gruppen.
      acc[purchaseId].items.push(item);
      return acc;
    },
    {} as Record<
      string,
      {
        productName: string;
        participantName?: string;
        items: typeof purschaseItems;
      }
    >,
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
            Dina köpta produkter och bokningar
          </h3>

          <Accordion type="single" collapsible className="space-y-2">
            {Object.entries(groupedPurchases).map(([purchaseId, group]) => (
              <AccordionItem
                key={purchaseId}
                value={purchaseId}
                className="border rounded-lg px-4 last:border-b"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex flex-1 items-center justify-between text-left pr-4">
                    <div>
                      <span className="text-xs text-brand">Produkt</span>
                      <p className="font-medium">
                        {group.productName}
                        {group.participantName &&
                          group.participantName !== user?.name && (
                            <span> (deltagare: {group.participantName})</span>
                          )}
                      </p>
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
                      const isLow = !pi.unlimited && pi.remainingCount <= 1;

                      return (
                        <div
                          key={pi.id}
                          className="flex items-start justify-between bg-muted p-3 rounded border"
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{courseName}</p>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-muted-foreground text-xs">
                                Dina bokningar:
                              </p>
                              <AutoBookBtn
                                purchaseItemId={pi.id}
                                disabled={
                                  !pi.unlimited && pi.remainingCount <= 0
                                }
                              />
                            </div>
                            {bookings.filter((b) => b.purchaseItemId === pi.id)
                              .length > 0 ? (
                              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                {bookings
                                  .filter((b) => b.purchaseItemId === pi.id)
                                  .map((b) => (
                                    <li
                                      key={b.id}
                                      className="text-sm bg-background px-4 py-2 rounded border flex items-center justify-between gap-3"
                                    >
                                      <span>
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
                                      </span>
                                      {!b.lesson.cancelled && (
                                        <span className="ml-3">
                                          <CancelBookingBtn bookingId={b.id} />
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
                            <p className="text-xs text-muted-foreground">
                              {pi.unlimited
                                ? "Obegränsat"
                                : `Kvar / totalt: ${pi.remainingCount} / ${pi.lessonsIncluded}`}
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
