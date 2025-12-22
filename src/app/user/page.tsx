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
          Dina produkter, och kurser du kan boka:
          <ul>
            {purschaseItems.map(async (pi) => (
              <li key={pi.id}>
                {pi.purchase.product.name} -{" "}
                {await getFullCourseNameFromId(pi.courseId)} - lektioner kvar:{" "}
                {pi.unlimited ? (
                  "obegränsat"
                ) : (
                  <span>
                    {pi.remainingCount} / {pi.lessonsIncluded}
                  </span>
                )}
              </li>
            ))}
          </ul>
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
