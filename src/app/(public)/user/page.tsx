import { Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import { pick } from "@/lib/i18n/pick";
import prisma from "@/lib/prisma";
import { getDictionary } from "@/locales/get-dictionary";
import { AutobookBtn } from "./AutobookBtn";
import BookingCal from "./components/BookingCal";
import { EditDetailsForm } from "./components/EditDetailsForm";
import { EditEmailForm } from "./components/EditEmailForm";
import { EditPwForm } from "./components/EditPwForm";
import OrderHistory from "./components/OrderHistory";
import { PurchaseItemBookings } from "./components/PurchaseItemsBookings";
import { TeacherProfileDialog } from "./components/TeacherProfileDialog";

export const metadata: Metadata = {
  title: "Min sida",
  description: "Hantera dina bokningar, ordrar och kontouppgifter.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const { lang, t } = await getDictionary();
  const _dateLocale = lang === "en" ? "en-GB" : "sv-SE";
  const sessionData = await getSessionData();

  if (!sessionData) {
    redirect("/signin?callbackUrl=/user");
  }

  const user = sessionData.user;

  const userDetails = user
    ? await prisma.userDetails.findUnique({ where: { userId: user.id } })
    : null;
  const userWithTeacherProfile = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        include: { teacherProfile: true },
      })
    : null;

  const { lessons = [] } = await getUserLessons();
  const { bookings = [] } = await getUserBookings();
  const purchaseItems: UserPurchaseWithProduct[] = await getUserPurchases();
  const pendingRegistrations = await getUserPendingRegistrations();
  const myParticipants = await getMyParticipants();
  const orders = await getUserOrders();

  const groupedPurchases = purchaseItems.reduce(
    (acc, item) => {
      const purchaseId = item.purchaseId;
      if (!acc[purchaseId]) {
        acc[purchaseId] = {
          productName: pick(item.purchase.product, "name", lang) as string,
          items: [],
        };
      }
      acc[purchaseId].items.push(item);
      return acc;
    },
    {} as Record<string, { productName: string; items: typeof purchaseItems }>,
  );

  return (
    <div className="flex-1 bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>
                  {t.user.profileTitle.replace("{{name}}", user?.name ?? "")}
                </CardTitle>
                <CardDescription className="mt-2">
                  {t.user.profileDescription}
                </CardDescription>
              </div>
              {userDetails && (
                <div className="text-right">
                  <Badge
                    variant={
                      userDetails.allowPhotoVideo ? "default" : "outline"
                    }
                    className={
                      userDetails.allowPhotoVideo
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : ""
                    }
                  >
                    {userDetails.allowPhotoVideo
                      ? t.user.photoBadgeOk
                      : t.user.photoBadgeNo}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t.user.bookings}
            </h3>
            <BookingCal
              purchaseItems={purchaseItems}
              lessons={lessons}
              bookings={bookings}
            />

            <div className="mt-8 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t.user.yourPurchases}
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
                            {t.user.productPack}
                          </span>
                          <p className="font-medium">
                            {group.productName}{" "}
                            {group.items[0]?.purchase.participant && (
                              <span>
                                ({group.items[0]?.purchase.participant?.name})
                              </span>
                            )}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {group.items.length}{" "}
                          {group.items.length === 1
                            ? t.user.courseOne
                            : t.user.courseMany}
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    {/* ok */}

                    <AccordionContent className="border-t pt-4 pb-2">
                      <Accordion type="multiple" className="space-y-2">
                        {group.items.map((pi) => {
                          const courseName = pick(
                            pi.course,
                            "name",
                            lang,
                          ) as string;

                          const remaining = calcRemainingCount({
                            purchase: pi.purchase,
                            purchaseItem: pi,
                          });

                          const isLow =
                            Number.isFinite(remaining) && remaining <= 3;

                          const piBookings = bookings
                            .filter((b) => b.purchaseItemId === pi.id)
                            .sort(
                              (a, b) =>
                                a.lesson.startTime.getTime() -
                                b.lesson.startTime.getTime(),
                            );

                          const isSwapped =
                            pi.orderItem.courseSelections
                              .map((cs) => cs.courseId)
                              .filter((fcs) => fcs === pi.courseId).length ===
                            0;

                          return (
                            <AccordionItem
                              key={pi.id}
                              value={pi.id}
                              className="bg-muted rounded-xl border px-3"
                            >
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex flex-1 items-center justify-between text-left pr-3">
                                  <div>
                                    <p className="font-medium text-sm">
                                      {courseName}{" "}
                                      {isSwapped && (
                                        <span className="inline-block p-2 border-destructive border-2 rounded-xl text-xs text-destructive">
                                          {t.user.orderHistory.swapped}
                                        </span>
                                      )}
                                    </p>
                                    {pi.purchase.participant &&
                                      pi.purchase.participant.name !==
                                        user?.name && (
                                        <p className="text-[10px] text-brand font-medium">
                                          {t.user.participantPrefix}{" "}
                                          {pi.purchase.participant.name}
                                        </p>
                                      )}
                                  </div>

                                  {!isSwapped && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Badge
                                        variant="outline"
                                        className={
                                          isLow
                                            ? "border-destructive text-destructive"
                                            : ""
                                        }
                                      >
                                        {t.user.clipsLeft.replace(
                                          "{{count}}",
                                          remaining === Infinity
                                            ? t.common.infinitySymbol
                                            : String(remaining),
                                        )}{" "}
                                        {pi.purchase.type === "CLIP"
                                          ? t.user.clipsLeftTotal
                                          : ""}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </AccordionTrigger>

                              <AccordionContent className="pb-3 space-y-3">
                                {isSwapped ? (
                                  ""
                                ) : (
                                  <div className="flex justify-end">
                                    <AutobookBtn
                                      purchaseItemId={pi.id}
                                      remainingClips={remaining}
                                      disabled={false}
                                    />
                                  </div>
                                )}

                                <PurchaseItemBookings
                                  bookings={piBookings}
                                  labelYourBookings={t.user.yourBookings}
                                  labelNoBookings={t.user.noBookings}
                                />
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {myParticipants.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> {t.user.savedParticipants}
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
                          <p className="text-xs text-muted-foreground">
                            {p.email}
                          </p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {p.allowPhotoVideo ? (
                            <span className="text-[9px] text-emerald-600 font-bold uppercase">
                              {t.user.photoBadgeShort}
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-600 font-bold uppercase">
                              {t.user.noPhotoBadgeShort}
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
                  <Clock className="w-4 h-4" /> {t.user.pendingRegistrations}
                </h3>
                <div className="space-y-2">
                  {pendingRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-4 border rounded-lg bg-amber-500/5 border-amber-500/20 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {pick(reg.product, "name", lang) as string}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.user.pendingStatusLabel}{" "}
                          <span className="text-amber-600 font-medium">
                            {t.user.pendingStatusValue}
                          </span>
                        </p>
                        {reg.participant &&
                          reg.participant.name !== user?.name && (
                            <p className="text-[10px] text-brand mt-1 uppercase font-bold">
                              {t.user.participantPrefix} {reg.participant.name}
                            </p>
                          )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-amber-600 border-amber-600/20"
                      >
                        {t.user.pendingProcessing}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <OrderHistory orders={orders} />

            {userDetails && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.user.contactInfo}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">{t.user.phoneLabel}</span>{" "}
                    {userDetails.phoneNumber || t.user.phoneEmpty}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{t.user.emailLabel}</span>{" "}
                    {user?.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.user.address}
                  </p>
                  <p className="text-sm mt-1">
                    {userDetails.address || t.user.addressEmpty}
                  </p>
                  <p className="text-sm">
                    {userDetails.postalCode} {userDetails.city}
                  </p>
                </div>
              </div>
            )}

            <div className="my-4 md:flex justify-around gap-4 p-2 rounded-lg border bg-muted/30">
              {userDetails && <EditDetailsForm details={userDetails} />}
              <EditPwForm />
              <EditEmailForm />
              {user?.role === "admin" && userWithTeacherProfile && (
                <TeacherProfileDialog user={userWithTeacherProfile} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
