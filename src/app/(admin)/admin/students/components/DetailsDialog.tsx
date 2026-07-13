"use client";

import { List } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { AdminStudentDetails } from "@/lib/actions/admin-students";
import { getAdminStudentDetails } from "@/lib/actions/admin-students";

interface Props {
  id: string;
  isParticipant: boolean;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
}

function ConsentBadge({ value }: { value: boolean | null | undefined }) {
  if (value) return <Badge>Ja</Badge>;
  return <Badge variant="outline">Nej</Badge>;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded border bg-muted/20 p-3 sm:grid-cols-[180px_1fr]">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="min-w-0 break-words text-sm">{value}</div>
    </div>
  );
}

function OptionalTextRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!hasText(value)) return null;
  return <DetailRow label={label} value={value} />;
}

function OptionalDateRow({
  label,
  value,
  includeTime = false,
}: {
  label: string;
  value: string | null | undefined;
  includeTime?: boolean;
}) {
  if (!value) return null;
  return <DetailRow label={label} value={formatDate(value, includeTime)} />;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-medium text-sm">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function LinkedUserDetails({
  user,
}: {
  user: NonNullable<AdminStudentDetails["linkedUser"]>;
}) {
  return (
    <DetailSection title="Kopplad användare">
      <DetailRow label="Namn" value={user.name} />
      <DetailRow label="E-post" value={user.email} />
      <OptionalTextRow label="Förnamn" value={user.firstName} />
      <OptionalTextRow label="Efternamn" value={user.lastName} />
      <OptionalTextRow label="Telefon" value={user.phone} />
      <OptionalTextRow label="Adress" value={user.address} />
      <OptionalTextRow label="Postnummer" value={user.postalCode} />
      <OptionalTextRow label="Ort" value={user.city} />
      <OptionalDateRow label="Födelsedatum" value={user.dateOfBirth} />
      <OptionalTextRow label="Bio" value={user.bio} />
      <OptionalTextRow label="Bio (EN)" value={user.bioEn} />
      <DetailRow
        label="Tillåter bilder/filmer"
        value={<ConsentBadge value={user.allowPhotoVideo} />}
      />
    </DetailSection>
  );
}

function ParticipantCard({
  participant,
}: {
  participant: AdminStudentDetails["addedParticipants"][number];
}) {
  return (
    <div className="space-y-3 rounded border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-medium text-sm">{participant.name}</h4>
        <Badge variant="secondary">Deltagare</Badge>
      </div>
      <div className="space-y-2">
        <OptionalTextRow label="E-post" value={participant.email} />
        <OptionalTextRow label="Telefon" value={participant.phone} />
        <DetailRow
          label="Tillåter bilder/filmer"
          value={<ConsentBadge value={participant.allowPhotoVideo} />}
        />
        <OptionalDateRow
          label="Skapad"
          value={participant.createdAt}
          includeTime
        />
        <OptionalDateRow
          label="Uppdaterad"
          value={participant.updatedAt}
          includeTime
        />
      </div>
      {participant.linkedUser ? (
        <LinkedUserDetails user={participant.linkedUser} />
      ) : null}
    </div>
  );
}

function AddedParticipantsList({
  participants,
}: {
  participants: AdminStudentDetails["addedParticipants"];
}) {
  return (
    <DetailSection title="Tillagda deltagare">
      {participants.length > 0 ? (
        participants.map((participant) => (
          <ParticipantCard key={participant.id} participant={participant} />
        ))
      ) : (
        <div className="text-muted-foreground text-sm">
          Användaren har inte lagt till några deltagare.
        </div>
      )}
    </DetailSection>
  );
}

function StudentDetailsContent({ details }: { details: AdminStudentDetails }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {details.type === "participant" ? "Deltagare" : "Användare"}
        </Badge>
        <span className="font-medium">{details.name}</span>
      </div>

      <DetailSection
        title={details.type === "participant" ? "Deltagare" : "Användare"}
      >
        <DetailRow label="Namn" value={details.name} />
        <OptionalTextRow label="E-post" value={details.email} />
        <OptionalTextRow label="Telefon" value={details.phone} />
        <OptionalTextRow label="Förnamn" value={details.firstName} />
        <OptionalTextRow label="Efternamn" value={details.lastName} />
        <OptionalTextRow label="Adress" value={details.address} />
        <OptionalTextRow label="Postnummer" value={details.postalCode} />
        <OptionalTextRow label="Ort" value={details.city} />
        <OptionalDateRow label="Födelsedatum" value={details.dateOfBirth} />
        <OptionalTextRow label="Bio" value={details.bio} />
        <OptionalTextRow label="Bio (EN)" value={details.bioEn} />
        <DetailRow
          label="Tillåter bilder/filmer"
          value={<ConsentBadge value={details.allowPhotoVideo} />}
        />
      </DetailSection>

      {details.customer ? (
        <DetailSection title="Köpare / ansvarig">
          <DetailRow label="Namn" value={details.customer.name} />
          <DetailRow label="E-post" value={details.customer.email} />
        </DetailSection>
      ) : null}

      {details.linkedUser ? (
        <LinkedUserDetails user={details.linkedUser} />
      ) : null}

      {details.type === "user" ? (
        <AddedParticipantsList participants={details.addedParticipants} />
      ) : null}

      <DetailSection title="System">
        <DetailRow
          label="Typ"
          value={details.type === "participant" ? "Deltagare" : "Användare"}
        />
        <DetailRow label="ID" value={details.id} />
        <OptionalDateRow label="Skapad" value={details.createdAt} includeTime />
        <OptionalDateRow
          label="Uppdaterad"
          value={details.updatedAt}
          includeTime
        />
      </DetailSection>
    </div>
  );
}

export function DetailsDialog({ id, isParticipant }: Props) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<AdminStudentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    getAdminStudentDetails({ id, isParticipant })
      .then((result) => {
        if (!isCurrent) return;

        if (!result.success) {
          setDetails(null);
          setError(result.error);
          return;
        }

        setDetails(result.details);
      })
      .catch(() => {
        if (!isCurrent) return;
        setDetails(null);
        setError("Kunde inte hämta detaljer.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [open, id, isParticipant]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <List /> Visa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] min-w-0 overflow-x-hidden overflow-y-visible sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Visar detaljer</DialogTitle>
          <DialogDescription>
            Här kan du se alla uppgifter som finns sparade för vald elev.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 max-h-[65dvh] overflow-x-hidden overflow-y-auto pt-1 pr-1">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">
              Hämtar detaljer...
            </div>
          ) : error ? (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          ) : details ? (
            <StudentDetailsContent details={details} />
          ) : (
            <div className="text-muted-foreground text-sm">
              Inga detaljer hittades.
            </div>
          )}
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Stäng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
