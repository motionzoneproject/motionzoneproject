/**
 * Fakturamottagaren anges separat från kontot.
 *
 * Kontot säger ingenting om vem som ska betala: en stor del av kontona är
 * registrerade i dansarens namn, och dansaren är ofta ett barn. Namnet på
 * fakturamottagaren är den betalningsansvariga personen, medan e-postadressen
 * bara är en leveransadress — den får gärna vara barnets, om det är dit
 * betalaren vill ha fakturan.
 */

/** Normaliserar ett namn för jämförelse: gemener, ihopdragna mellanslag. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Födelsedatum kommer som Date ur databasen och som "YYYY-MM-DD" ur
 * formulären, så kontrollerna tar emot båda.
 */
function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ålder i hela år vid ett givet datum. */
export function ageAt(dateOfBirth: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = at.getMonth() - dateOfBirth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && at.getDate() < dateOfBirth.getDate())
  )
    age--;

  return age;
}

/**
 * Om personen är under 18 år. Saknas födelsedatum kan vi inte veta, och då
 * ställer vi inga extra krav.
 */
export function isMinor(
  dateOfBirth: Date | string | null | undefined,
  at: Date = new Date(),
): boolean {
  const date = toDate(dateOfBirth);
  if (!date) return false;
  return ageAt(date, at) < 18;
}

/**
 * Vilken av reglerna som sa ifrån. Anroparen väljer texten själv: servern tar
 * den härifrån, klienten översätter.
 */
export type InvoiceNameProblem = "minorAccount" | "minorParticipant";

export const INVOICE_NAME_ERRORS: Record<InvoiceNameProblem, string> = {
  minorAccount:
    "Kontot är registrerat på en person under 18 år, så fakturan kan inte ställas till samma person. Ange den vuxna som ska betala.",
  minorParticipant:
    "Namnet tillhör en deltagare under 18 år, som inte kan faktureras. Ange den vuxna som ska betala.",
};

/**
 * Kontrollerar fakturamottagarens namn.
 *
 * Två sätt att råka skriva barnets namn, båda lika vanliga: kontot står i
 * dansarens namn och man låter det stå kvar, eller så är kontot förälderns
 * men man fyller i den som ska gå kursen. Det andra fallet syns bara mot
 * deltagarna på ordern, och det är där uppgiften faktiskt finns.
 *
 * Kravet gäller bara namnet. E-postadressen jämförs aldrig: det är fritt fram
 * att skicka fakturan till dansarens adress.
 *
 * @returns vilken regel som sa ifrån, eller null när allt är i sin ordning.
 */
export function checkInvoiceName(input: {
  invoiceName: string;
  accountName: string;
  accountDateOfBirth: Date | string | null | undefined;
  /**
   * Deltagarna på ordern. Utelämnas de görs bara kontrollen mot kontot — en
   * order utan kända deltagare ska inte stoppas av en kontroll vi inte kan
   * göra.
   */
  participants?: { name: string; dateOfBirth?: Date | string | null }[];
  at?: Date;
}): InvoiceNameProblem | null {
  const { invoiceName, accountName, accountDateOfBirth, participants, at } =
    input;
  const typedName = normalizeName(invoiceName);

  if (
    isMinor(accountDateOfBirth, at) &&
    typedName === normalizeName(accountName)
  )
    return "minorAccount";

  const matchesMinorParticipant = participants?.some(
    (p) => isMinor(p.dateOfBirth, at) && normalizeName(p.name) === typedName,
  );
  if (matchesMinorParticipant) return "minorParticipant";

  return null;
}
