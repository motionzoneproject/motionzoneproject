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

/** Vem fakturan ställs till, valt i stället för inskrivet. */
export type InvoiceRecipientKind = "self" | "participant" | "other";

export type InvoiceRecipientProblem =
  | InvoiceNameProblem
  | "unconfirmedAge"
  | "missingName"
  | "unknownParticipant";

export const INVOICE_RECIPIENT_ERRORS: Record<InvoiceRecipientProblem, string> =
  {
    ...INVOICE_NAME_ERRORS,
    unconfirmedAge:
      "Vi vet inte hur gammal den här personen är. Bekräfta att hen är över 18 år, eller välj någon annan.",
    missingName: "Ange namnet på den som ska betala.",
    unknownParticipant:
      "Den valda deltagaren hör inte till den här beställningen. Ladda om sidan och försök igen.",
  };

/**
 * Prövar ett val av fakturamottagare.
 *
 * Skillnaden mot att jämföra namn är att ett val pekar ut en person vi har
 * födelsedatum för. Då vet vi svaret i stället för att gissa på stavning.
 *
 * Tre utfall: känd ålder under 18 går inte alls, känd ålder över 18 går rakt
 * igenom, och okänd ålder kräver att kunden intygar att personen är myndig.
 * Det sista är inget vi kan kontrollera, men det gör påståendet till kundens
 * eget — och det är det enda vi kan begära när födelsedatum saknas.
 *
 * "Annan" är alltid okänd ålder, och där finns fritexten kvar. Namnkontrollen
 * mot deltagarna är därför kvar som skyddsnät för just det alternativet.
 */
export function checkInvoiceRecipient(input: {
  kind: InvoiceRecipientKind;
  /** Namnet på den valda personen, upplöst av anroparen. */
  chosenName: string;
  /** Den valda personens födelsedatum. Saknas det är åldern okänd. */
  chosenDateOfBirth?: Date | string | null;
  adultConfirmed: boolean;
  accountName: string;
  accountDateOfBirth?: Date | string | null;
  participants?: { name: string; dateOfBirth?: Date | string | null }[];
  /**
   * Av när uppgiften inte hör till en order. Kontots förifyllning fakturerar
   * ingen, och intyget hör hemma där pengarna faktiskt begärs in.
   */
  requireConfirmation?: boolean;
  at?: Date;
}): InvoiceRecipientProblem | null {
  const {
    kind,
    chosenName,
    chosenDateOfBirth,
    adultConfirmed,
    accountName,
    accountDateOfBirth,
    participants,
    requireConfirmation = true,
    at,
  } = input;

  if (chosenName.trim().length < 2) return "missingName";

  const confirmed = adultConfirmed || !requireConfirmation;

  if (kind !== "other") {
    if (isMinor(chosenDateOfBirth, at))
      return kind === "self" ? "minorAccount" : "minorParticipant";

    if (!chosenDateOfBirth && !confirmed) return "unconfirmedAge";

    return null;
  }

  if (!confirmed) return "unconfirmedAge";

  return checkInvoiceName({
    invoiceName: chosenName,
    accountName,
    accountDateOfBirth,
    participants,
    at,
  });
}

/** Det som faktiskt skrivs på ordern när valet gått igenom. */
export type ResolvedInvoiceRecipient = {
  invoiceName: string;
  invoiceEmail: string;
  invoicePhone: string | null;
  /**
   * Sätts bara när åldern var okänd och kunden fick intyga den. Var åldern
   * känd behövdes inget intyg, och då ska fältet inte påstå att ett gavs.
   */
  invoiceAdultConfirmedAt: Date | null;
};

/**
 * Löser upp kundens val till namnet som ska stå på fakturan, och prövar det.
 *
 * Namnet hämtas här och inte från klienten: för "jag själv" och en deltagare
 * vet servern redan vem personen är, och ett namn som följer med i anropet
 * skulle bara kunna vara fel eller påhittat.
 */
export function resolveInvoiceRecipient(input: {
  choice: {
    kind: InvoiceRecipientKind;
    participantId?: string;
    invoiceName?: string;
    invoiceEmail: string;
    invoicePhone: string;
    adultConfirmed: boolean;
  };
  account: { name: string; dateOfBirth?: Date | string | null };
  /** Personerna som går att välja: deltagarna på ordern, eller kundens egna. */
  participants: {
    id: string;
    name: string;
    dateOfBirth?: Date | string | null;
  }[];
  /** Se checkInvoiceRecipient. */
  requireConfirmation?: boolean;
  at?: Date;
}):
  | { problem: InvoiceRecipientProblem }
  | { recipient: ResolvedInvoiceRecipient } {
  const {
    choice,
    account,
    participants,
    requireConfirmation = true,
    at,
  } = input;

  let chosenName = "";
  let chosenDateOfBirth: Date | string | null | undefined;

  if (choice.kind === "self") {
    chosenName = account.name;
    chosenDateOfBirth = account.dateOfBirth;
  } else if (choice.kind === "participant") {
    const participant = participants.find((p) => p.id === choice.participantId);
    if (!participant) return { problem: "unknownParticipant" };

    chosenName = participant.name;
    chosenDateOfBirth = participant.dateOfBirth;
  } else {
    chosenName = choice.invoiceName?.trim() ?? "";
  }

  const problem = checkInvoiceRecipient({
    kind: choice.kind,
    chosenName,
    chosenDateOfBirth,
    adultConfirmed: choice.adultConfirmed,
    accountName: account.name,
    accountDateOfBirth: account.dateOfBirth,
    participants,
    requireConfirmation,
    at,
  });
  if (problem) return { problem };

  // Intyget gäller bara de fall där vi inte kunde veta åldern själva.
  const ageWasUnknown = choice.kind === "other" || !chosenDateOfBirth;
  const confirmedNow = ageWasUnknown && choice.adultConfirmed;

  return {
    recipient: {
      invoiceName: chosenName.trim(),
      invoiceEmail: choice.invoiceEmail,
      invoicePhone: choice.invoicePhone || null,
      invoiceAdultConfirmedAt: confirmedNow ? (at ?? new Date()) : null,
    },
  };
}

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
