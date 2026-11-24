/**
 * Vem läraren ska ringa eller mejla om en elev.
 *
 * En elev är antingen kontohavaren själv eller en deltagare som någon lagt
 * till, ofta ett barn. Deltagarens egna uppgifter går först, sedan
 * deltagarens eget konto om det finns, och sist kontohavaren som lade till
 * deltagaren (föräldern). Telefon och mejl väljs var för sig: ett barn kan ha
 * en egen mobil men ingen egen mejl.
 */

export type ContactValue = {
  value: string;
  /** Uppgiften är kundens (till exempel förälderns), inte elevens egen. */
  viaCustomer: boolean;
};

export type StudentContact = {
  phone: ContactValue | null;
  email: ContactValue | null;
};

type AccountContact = {
  email: string;
  details: { phoneNumber: string | null } | null;
};

export type ParticipantContactSource = {
  phone: string | null;
  email: string | null;
  /** Deltagarens eget konto, om hen har ett. */
  user: AccountContact | null;
  /** Kontohavaren som lade till deltagaren. */
  addedBy: AccountContact;
};

export const NO_CONTACT: StudentContact = { phone: null, email: null };

/** Tomma strängar och blanksteg räknas som att uppgiften saknas. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function pick(
  own: (string | null | undefined)[],
  customer: string | null | undefined,
): ContactValue | null {
  for (const candidate of own) {
    const value = clean(candidate);
    if (value) return { value, viaCustomer: false };
  }
  const value = clean(customer);
  return value ? { value, viaCustomer: true } : null;
}

export function contactForParticipant(
  participant: ParticipantContactSource,
): StudentContact {
  return {
    phone: pick(
      [participant.phone, participant.user?.details?.phoneNumber],
      participant.addedBy.details?.phoneNumber,
    ),
    email: pick(
      [participant.email, participant.user?.email],
      participant.addedBy.email,
    ),
  };
}

/** Kontohavaren är själv eleven, så uppgifterna är alltid hens egna. */
export function contactForUser(user: AccountContact): StudentContact {
  return {
    phone: pick([user.details?.phoneNumber], null),
    email: pick([user.email], null),
  };
}
