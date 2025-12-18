import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
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
          (BOKA)
          <BookingCal
            purschaseItems={purschaseItems}
            lessons={lessons}
            bookings={bookings}
          />
          <br />
          (Uppgifter)
        </CardContent>
      </Card>
    </div>
  );
}
