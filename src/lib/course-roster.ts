/**
 * Vem som går en kurs.
 *
 * Ett köp säger vad eleven får gå på, inte vad hen faktiskt går. För en
 * vanlig kurs är det samma sak, men ett terminskort ger kursrader i tjugotal
 * kurser och ett program i ett sjuttontal. Att räkna in köparen i alla dem är
 * det som gjorde elevlistorna fel: samma få elever överallt, och ingen av dem
 * där de faktiskt går.
 *
 * Regeln för en kursrad:
 *
 * 1. Finns sparade kursval på orderraden och kursen inte är bland dem, är
 *    raden utbytt i paketet och räknas inte.
 * 2. Autobokar produkten räknas raden. Där ska eleven ha bokningar, och
 *    saknas de är det ett fel som ska synas i listan, inte försvinna ur den.
 * 3. Ger köpet bara en kurs räknas raden. Det råder inget tvivel om vilken
 *    kurs som avses.
 * 4. Annars — terminskort, program, klippkort över flera kurser — avgör
 *    bokningarna. Schemat sätts i schemadialogen, och elevlistan följer med.
 */
export function placesStudentInCourse(item: {
  courseId: string;
  /** Kursval sparade på orderraden. Tom när produkten saknar val. */
  selectedCourseIds: string[];
  /** Produkten bokar in köparen automatiskt när ordern beviljas. */
  autobook: boolean;
  /** Hur många kurser köpet ger. */
  courseCount: number;
  /** Bokningar på kursraden som inte är avbokade. 0 för en obeviljad order. */
  activeBookings: number;
}): boolean {
  if (
    item.selectedCourseIds.length > 0 &&
    !item.selectedCourseIds.includes(item.courseId)
  )
    return false;

  if (item.autobook) return true;
  if (item.courseCount <= 1) return true;

  return item.activeBookings > 0;
}

/** Nyckeln som adminkoden identifierar en elev med. */
export function studentKeyOf(input: {
  participantId?: string | null;
  userId: string;
}): string {
  return input.participantId
    ? `participant:${input.participantId}`
    : `user:${input.userId}`;
}
