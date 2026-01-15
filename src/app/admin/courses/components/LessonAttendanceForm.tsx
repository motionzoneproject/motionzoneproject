"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Lesson } from "@/generated/prisma/client";
import {
  type BookingWithPurchaseParticipant,
  getBookingsFromLesson,
  getUsersWithPurchasedProductsWithCourseInIt,
  removeUserFromLesson,
  type UserPurchasesForCourse,
} from "@/lib/actions/admin";
import AddUserBtn from "./AddUserBtn";

interface Props {
  lesson: Lesson;
  initialBookings?: BookingWithPurchaseParticipant[];
  initialUsers?: UserPurchasesForCourse[];
  refreshOnOpen?: boolean;
}

export default function LessonAttendanceForm({
  lesson,
  initialBookings = [],
  initialUsers = [],
  refreshOnOpen = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] =
    useState<BookingWithPurchaseParticipant[]>(initialBookings);
  const [usersInCourse, setUsersInCourse] =
    useState<UserPurchasesForCourse[]>(initialUsers);

  useEffect(() => {
    setBookings(initialBookings);
    setUsersInCourse(initialUsers);
  }, [initialBookings, initialUsers]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const [nextBookings, usersResult] = await Promise.all([
      getBookingsFromLesson(lesson.id),
      getUsersWithPurchasedProductsWithCourseInIt(lesson.courseId),
    ]);
    setBookings(nextBookings ?? []);
    setUsersInCourse(usersResult.users ?? []);
    setLoading(false);
  }, [lesson.courseId, lesson.id]);

  useEffect(() => {
    if (!refreshOnOpen || !isOpen) return;
    refreshData();
  }, [isOpen, refreshData, refreshOnOpen]);

  const removeUser = useCallback(
    async (userId: string) => {
      const response = await removeUserFromLesson(userId, lesson.id);

      if (response.success) {
        toast.success(response.msg);
        await refreshData();
      } else {
        toast.error(response.msg);
      }
    },
    [lesson.id, refreshData],
  );
  //   const router = useRouter();

  // fix: när profilsidan för elever är gjort, blir det lättare att göra det sista här.

  const activeBookingsCount = (bookings ?? []).filter(
    (b) => !b.cancelled,
  ).length;
  const isFull =
    lesson.maxBookings > 0 && activeBookingsCount >= lesson.maxBookings;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(e) => {
        setIsOpen(e);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={"secondary"}
          className="cursor-pointer mb-3"
          // disabled={lesson.cancelled} // fix: närvaro tes ej bort om den ställs in som det är nu.s
        >
          Närvaro
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Närvaro</DialogTitle>
          <DialogDescription>
            Här kan du se, lägga till eller ta bort deltagare från tillfället.
          </DialogDescription>
        </DialogHeader>
        <Card>
          <CardContent>
            <AddUserBtn
              refresher={refreshData}
              lessonId={lesson.id}
              usersInCourse={usersInCourse ?? []}
              isFull={isFull}
            />

            <div className="w-full flex justify-between"></div>
            {!loading ? (
              bookings.map((b) => {
                // 1. Hitta användaren i listan
                const user = usersInCourse?.find((u) => u.id === b.userId);

                // 3. Hitta produktnamnet kopplat till det köpet
                const productName = user?.purchases.find((p) =>
                  p.PurchaseItems.some((pi) => pi.id === b.purchaseItemId),
                )?.product.name;

                const participantName =
                  b.purchaseItem.purchase.participant?.name;

                return (
                  <div
                    key={b.id}
                    className="w-full flex m-1 justify-between items-center hover:bg-muted/30 p-2 rounded"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {participantName || user?.name || "Laddar..."}
                      </span>
                      {participantName && user?.name && (
                        <span className="text-xs text-muted-foreground">
                          Köpare: {user.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground uppercase">
                        {productName || "Produkt saknas"}
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeUser(b.userId)}
                      className="cursor-pointer"
                    >
                      X
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center">
                <div className="w-12 h-12 rounded-full border-3 border-border border-t-foreground/40 animate-spin mx-auto"></div>
              </div>
            )}
          </CardContent>
        </Card>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Klar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
