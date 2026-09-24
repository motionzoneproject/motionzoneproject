"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type InvoiceRecipientKind, isMinor } from "@/lib/invoice-recipient";

/** En person som går att välja: kontoinnehavaren eller en deltagare. */
export type InvoiceCandidate = {
  /** "self" för kontoinnehavaren, annars deltagarens id. */
  id: string;
  kind: "self" | "participant";
  name: string;
  email?: string | null;
  dateOfBirth?: Date | string | null;
};

export type InvoiceRecipientValue = {
  kind: InvoiceRecipientKind;
  participantId?: string;
  /** Fritext, används bara när kind är "other". */
  invoiceName: string;
  invoiceEmail: string;
  invoicePhone: string;
  adultConfirmed: boolean;
};

/**
 * Texterna kommer utifrån: kassan och profilsidan översätter dem, adminvyn
 * skickar svenska direkt eftersom resten av den vyn är skriven så.
 */
export type InvoiceRecipientLabels = {
  whoPays: string;
  self: string;
  other: string;
  minorHint: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailHelp: string;
  phoneLabel: string;
  phonePlaceholder: string;
  adultConfirm: string;
  adultConfirmHelp: string;
};

/**
 * Låter kunden peka ut fakturamottagaren i stället för att skriva ett namn.
 *
 * Fritext gick inte att kontrollera: ett barns namn, stavat lite hur som
 * helst, såg ut som vilket namn som helst. Väljer man en person i listan vet
 * vi i stället vem det är, och kan säga nej direkt — barnen står kvar i listan,
 * utgråade med anledningen synlig, så det framgår varför.
 *
 * Saknas födelsedatum kan vi inte veta något, och då får kunden intyga att
 * personen är myndig. Samma sak gäller "annan", som alltid är okänd för oss.
 */
export function InvoiceRecipientPicker({
  candidates,
  value,
  onChange,
  labels,
  idPrefix,
  requireConfirmation = true,
}: {
  candidates: InvoiceCandidate[];
  value: InvoiceRecipientValue;
  onChange: (next: InvoiceRecipientValue) => void;
  labels: InvoiceRecipientLabels;
  idPrefix: string;
  /** Av på kontots förifyllning: intyget hör till en order, inte till kontot. */
  requireConfirmation?: boolean;
}) {
  const selectedKey =
    value.kind === "other" ? "other" : (value.participantId ?? "self");

  const selected = candidates.find((c) => c.id === selectedKey);

  // Vi vet bara åldern på den vi känner igen och har födelsedatum för.
  const ageUnknown = value.kind === "other" || !selected?.dateOfBirth;
  const needsConfirmation = requireConfirmation && ageUnknown;

  const pick = (key: string) => {
    const candidate = candidates.find((c) => c.id === key);

    if (!candidate) {
      onChange({
        ...value,
        kind: "other",
        participantId: undefined,
        adultConfirmed: false,
      });
      return;
    }

    onChange({
      ...value,
      kind: candidate.kind,
      participantId:
        candidate.kind === "participant" ? candidate.id : undefined,
      // Byter man person följer personens adress med, om hen har någon.
      invoiceEmail: candidate.email || value.invoiceEmail,
      adultConfirmed: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">{labels.whoPays}</Label>

        <RadioGroup value={selectedKey} onValueChange={pick} className="gap-2">
          {candidates.map((candidate) => {
            const minor = isMinor(candidate.dateOfBirth);
            const id = `${idPrefix}-recipient-${candidate.id}`;

            return (
              <div key={candidate.id} className="flex items-start gap-2">
                <RadioGroupItem
                  value={candidate.id}
                  id={id}
                  disabled={minor}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={id}
                  className={`text-sm font-normal ${
                    minor ? "text-muted-foreground" : ""
                  }`}
                >
                  {candidate.kind === "self"
                    ? `${labels.self} (${candidate.name})`
                    : candidate.name}
                  {minor && (
                    <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
                      {labels.minorHint}
                    </span>
                  )}
                </Label>
              </div>
            );
          })}

          <div className="flex items-start gap-2">
            <RadioGroupItem
              value="other"
              id={`${idPrefix}-recipient-other`}
              className="mt-0.5"
            />
            <Label
              htmlFor={`${idPrefix}-recipient-other`}
              className="text-sm font-normal"
            >
              {labels.other}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {value.kind === "other" && (
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${idPrefix}-invoice-name`}>
            {labels.nameLabel}
          </Label>
          <Input
            id={`${idPrefix}-invoice-name`}
            value={value.invoiceName}
            placeholder={labels.namePlaceholder}
            onChange={(e) =>
              onChange({ ...value, invoiceName: e.target.value })
            }
          />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`${idPrefix}-invoice-email`}>
          {labels.emailLabel}
        </Label>
        <Input
          id={`${idPrefix}-invoice-email`}
          type="email"
          value={value.invoiceEmail}
          placeholder={labels.emailPlaceholder}
          onChange={(e) => onChange({ ...value, invoiceEmail: e.target.value })}
        />
        <p className="text-[11px] text-muted-foreground">{labels.emailHelp}</p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`${idPrefix}-invoice-phone`}>
          {labels.phoneLabel}
        </Label>
        <Input
          id={`${idPrefix}-invoice-phone`}
          value={value.invoicePhone}
          placeholder={labels.phonePlaceholder}
          onChange={(e) => onChange({ ...value, invoicePhone: e.target.value })}
        />
      </div>

      {needsConfirmation && (
        <div className="space-y-1 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 dark:border-amber-500/40 dark:bg-amber-950/40">
          <div className="flex items-start gap-2">
            <Checkbox
              id={`${idPrefix}-adult-confirm`}
              checked={value.adultConfirmed}
              onCheckedChange={(checked) =>
                onChange({ ...value, adultConfirmed: checked === true })
              }
              className="mt-0.5"
            />
            <Label
              htmlFor={`${idPrefix}-adult-confirm`}
              className="text-xs font-normal text-amber-800 dark:text-amber-300"
            >
              {labels.adultConfirm}
            </Label>
          </div>
          <p className="pl-6 text-[11px] text-amber-800/80 dark:text-amber-300/80">
            {labels.adultConfirmHelp}
          </p>
        </div>
      )}
    </div>
  );
}
