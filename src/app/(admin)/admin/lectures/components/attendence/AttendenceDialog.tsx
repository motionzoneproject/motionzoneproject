import {
  AttendeDialogUI,
  type BookingsDialogLesson,
} from "./AttendenceDialogUI";

/**
 * Bokningsdialogen för en lektion, från en serverkomponent.
 *
 * Plockar ut de fält dialogen behöver, så att inte hela lektionen — med kurs,
 * lärare och bokningar — skickas till webbläsaren. Själva bokningarna hämtas
 * när dialogen öppnas.
 */
export function AttendeDialog({
  lesson,
  bookingCount,
}: {
  lesson: BookingsDialogLesson;
  bookingCount: number;
}) {
  return (
    <AttendeDialogUI
      lesson={{
        id: lesson.id,
        courseId: lesson.courseId,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      }}
      bookingCount={bookingCount}
    />
  );
}
