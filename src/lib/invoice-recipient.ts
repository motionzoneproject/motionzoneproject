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
 * Om kontot är registrerat på någon under 18 år. Saknas födelsedatum kan vi
 * inte veta, och då ställer vi inga extra krav.
 */
export function isMinor(
  dateOfBirth: Date | null | undefined,
  at: Date = new Date(),
): boolean {
  if (!dateOfBirth) return false;
  return ageAt(dateOfBirth, at) < 18;
}

export const MINOR_INVOICE_ERROR =
  "Kontot är registrerat på en person under 18 år, så fakturan kan inte ställas till samma person. Ange den vuxna som ska betala.";

/**
 * Kontrollerar fakturamottagarens namn mot kontot.
 *
 * Kravet gäller bara namnet, och bara när kontoinnehavaren är omyndig — en
 * omyndig kan inte faktureras. E-postadressen jämförs aldrig: det är fritt
 * fram att skicka fakturan till dansarens adress.
 *
 * @returns ett felmeddelande, eller null när allt är i sin ordning.
 */
export function checkInvoiceName(input: {
  invoiceName: string;
  accountName: string;
  accountDateOfBirth: Date | null | undefined;
  at?: Date;
}): string | null {
  const { invoiceName, accountName, accountDateOfBirth, at } = input;

  if (!isMinor(accountDateOfBirth, at)) return null;
  if (normalizeName(invoiceName) !== normalizeName(accountName)) return null;

  return MINOR_INVOICE_ERROR;
}
