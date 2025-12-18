"use client";

// Här har jag nog nästlan in mig i en "use client"-lösning, som förmodligen går att lösa utan. Har försökt använda best practice i övrigt, men kommer inte snabbt på hur jag kan ändra allt för att undvika detta eftersom filtrering på termin osv sker på komponentnivå för varje lektion. Det här kan jag klura ut sen, om detta är tillräckligt säkert för första lanseringen. Inser att det skulle gå att ev manupilera hur många bokningar en kund har, men isf som admin, och använder transaction samt descrement i server-actions.
// Provar göra PR på detta, för att gå vidare till viktigare funktionalitet.

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
import {
  getUsersWithPurchasedProductsWithCourseInIt,
  type LessonWithBookings,
  removeUserFromLesson,
  type UserPurchasesForCourse,
} from "@/lib/actions/admin";
import AddUserBtn from "./AddUserBtn";

interface Props {
  lesson: LessonWithBookings;
}

export default function LessonAttendanceForm({ lesson }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [usersInCourse, setUsersInCourse] =
    useState<UserPurchasesForCourse[]>();
  const [uicSet, setUicSet] = useState<boolean>();

  useEffect(() => {
    const getAllStudentsWithCourse = async () => {
      setLoading(true);
      setUicSet(true);
      const response = await getUsersWithPurchasedProductsWithCourseInIt(
        lesson.courseId,
      );

      if (response.users) setUsersInCourse(response.users);
      setLoading(false);
    };

    if (!uicSet) getAllStudentsWithCourse();
  }, [uicSet, lesson.courseId]);

  const refresher = useCallback(() => {
    setUicSet(false); // fix - detta tar lång tid att uppdaatera, är en ganska lång lista att hämta. Kommer bli bättre om vi inte kör "use client"
  }, []);

  const removeUser = useCallback(
    async (userId: string) => {
      const response = await removeUserFromLesson(userId, lesson.id);

      if (response.success) {
        toast.success(response.msg);
        refresher();
      } else {
        toast.error(response.msg);
      }
    },
    [refresher, lesson.id],
  );
  //   const router = useRouter();

  // fix: när profilsidan för elever är gjort, blir det lättare att göra det sista här.

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(e) => {
        setIsOpen(e);
        if (e === true) {
          refresher(); // Kör hämta-data-loopen varje gång man öppnar dialogen så det uppdateraas om lektionen har ställt in t.ex.
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={"default"}
          className="bg-green-500 cursor-pointer mb-3"
          // disabled={lesson.cancelled} // fix: närvaro tes ej bort om den ställs in som det är nu.s
        >
          Närvaro
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Närvaro</DialogTitle>
          <DialogDescription>
            Här kan du se, lägga till eller ta bort elever från tillfället.
          </DialogDescription>
        </DialogHeader>
        <Card>
          <CardContent>
            <AddUserBtn
              refresher={refresher}
              lessonId={lesson.id}
              usersInCourse={usersInCourse ?? []}
            />

            <div className="w-full flex justify-between"></div>
            {!loading ? (
              lesson.bookings.map((b) => {
                // 1. Hitta användaren i listan
                const user = usersInCourse?.find((u) => u.id === b.userId);

                // 3. Hitta produktnamnet kopplat till det köpet
                const productName = user?.purchases.find((p) =>
                  p.PurchaseItems.some((pi) => pi.id === b.purchaseItemId),
                )?.product.name;

                return (
                  <div
                    key={b.id}
                    className="w-full flex m-1 justify-between items-center hover:bg-accent p-2 rounded"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user?.name || "Laddar..."}
                      </span>
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
                <div className="w-12 h-12 rounded-full border-3 border-blue-500 border-t-blue-300 animate-spin mx-auto"></div>
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
