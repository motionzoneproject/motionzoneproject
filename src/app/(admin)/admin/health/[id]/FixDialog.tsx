"use client";

import { Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  backfillPurchaseItems,
  createMissingPurchase,
  grantTeacherRole,
  mergeParticipants,
  removeStaleBooking,
} from "@/lib/actions/health-actions";
import type { HealthFix, ParticipantCopy } from "@/lib/admin-health";
import { formatShortFriendlyDate } from "@/lib/date-utils";

export function FixDialog({
  fix,
  label = "Åtgärda",
  onFixed,
}: {
  fix: HealthFix;
  /** Namnger raden när flera knappar visas bredvid varandra i översikten. */
  label?: string;
  /**
   * Anropas när åtgärden lyckats. Översikten håller sina resultat i
   * klient-state, så router.refresh() räcker inte där — den behöver köra om
   * kontrollerna själv.
   */
  onFixed?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Wrench className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {fix.kind === "participant-merge" && (
          <MergeParticipants
            copies={fix.copies}
            onDone={() => {
              setOpen(false);
              onFixed?.();
            }}
          />
        )}
        {fix.kind === "teacher-role" && (
          <GrantTeacherRole
            fix={fix}
            onDone={() => {
              setOpen(false);
              onFixed?.();
            }}
          />
        )}
        {fix.kind === "purchase-backfill" && (
          <BackfillPurchase
            fix={fix}
            onDone={() => {
              setOpen(false);
              onFixed?.();
            }}
          />
        )}
        {fix.kind === "booking-remove" && (
          <RemoveBooking
            fix={fix}
            onDone={() => {
              setOpen(false);
              onFixed?.();
            }}
          />
        )}
        {fix.kind === "order-purchase" && (
          <CreatePurchase
            fix={fix}
            onDone={() => {
              setOpen(false);
              onFixed?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Adminen väljer vilken kopia som ska överleva. Vi gissar inte: kopiorna kan
 * skilja sig i e-post, födelsedatum och fotosamtycke, och att slå ihop dem
 * automatiskt skulle kunna bredda ett samtycke tyst.
 */
function MergeParticipants({
  copies,
  onDone,
}: {
  copies: ParticipantCopy[];
  onDone: () => void;
}) {
  const router = useRouter();
  const groupName = useId();
  const [isPending, startTransition] = useTransition();

  // Förvalt: den med flest kopplingar, annars den äldsta (listan kommer
  // sorterad på skapandedatum).
  const [keepId, setKeepId] = useState(
    () =>
      [...copies].sort(
        (a, b) =>
          b.orderItems + b.purchases - (a.orderItems + a.purchases) ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      )[0].id,
  );

  const removeIds = copies
    .filter((copy) => copy.id !== keepId)
    .map((copy) => copy.id);

  const movedLinks = copies
    .filter((copy) => copy.id !== keepId)
    .reduce((sum, copy) => sum + copy.orderItems + copy.purchases, 0);

  const submit = () => {
    startTransition(async () => {
      const result = await mergeParticipants(keepId, removeIds);
      if (result.success) {
        toast.success(result.msg);
        onDone();
        router.refresh();
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Slå ihop {copies.length} deltagare</DialogTitle>
        <DialogDescription>
          Välj vilken som ska behållas. De andra raderas och deras ordrar och
          köp flyttas över — inget köp går förlorat.
        </DialogDescription>
      </DialogHeader>

      <fieldset className="space-y-2">
        <legend className="sr-only">Deltagare att behålla</legend>
        {copies.map((copy) => (
          <label
            key={copy.id}
            htmlFor={`${groupName}-${copy.id}`}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors ${
              copy.id === keepId
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <input
              type="radio"
              id={`${groupName}-${copy.id}`}
              name={groupName}
              value={copy.id}
              checked={copy.id === keepId}
              onChange={() => setKeepId(copy.id)}
              className="mt-1"
            />
            <div className="min-w-0 space-y-0.5">
              <div className="font-medium">{copy.name}</div>
              <div className="text-muted-foreground">
                {copy.email ?? "ingen e-post"}
                {copy.phone ? ` · ${copy.phone}` : ""}
              </div>
              <div className="text-muted-foreground">
                {copy.dateOfBirth
                  ? `Född ${formatShortFriendlyDate(copy.dateOfBirth)}`
                  : "Inget födelsedatum"}
                {" · "}
                {copy.allowPhotoVideo ? "Fotosamtycke" : "Inget fotosamtycke"}
              </div>
              <div className="text-muted-foreground">
                {copy.orderItems} ordrar · {copy.purchases} köp · tillagd{" "}
                {formatShortFriendlyDate(copy.createdAt)}
              </div>
            </div>
          </label>
        ))}
      </fieldset>

      <DialogFooter className="gap-2 sm:justify-between">
        <span className="self-center text-sm text-muted-foreground">
          {removeIds.length} tas bort, {movedLinks} kopplingar flyttas
        </span>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Slår ihop…" : "Slå ihop"}
        </Button>
      </DialogFooter>
    </>
  );
}

function GrantTeacherRole({
  fix,
  onDone,
}: {
  fix: Extract<HealthFix, { kind: "teacher-role" }>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await grantTeacherRole(fix.userId);
      if (result.success) {
        toast.success(result.msg);
        onDone();
        router.refresh();
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ge {fix.userName} lärarbehörighet</DialogTitle>
        <DialogDescription>
          {fix.userName} står som lärare på {fix.courses} aktiva kurser men har
          inte rollen. Med den kan hen logga in i adminpanelen och hantera sina
          egna lektioner — inget annat.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Sätter roll…" : "Ge lärarbehörighet"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Skapar kursraderna på ett köp som blev utan. Kan produkten inte leverera
 * dem säger dialogen det rakt ut i stället för att erbjuda en knapp som ändå
 * skulle vägra.
 */
function BackfillPurchase({
  fix,
  onDone,
}: {
  fix: Extract<HealthFix, { kind: "purchase-backfill" }>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canBackfill = fix.courseNames.length > 0;

  const submit = () => {
    startTransition(async () => {
      const result = await backfillPurchaseItems(fix.purchaseId);
      if (result.success) {
        toast.success(result.msg);
        onDone();
        router.refresh();
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Hämta kurser från produkten</DialogTitle>
        <DialogDescription>
          {fix.userName} har betalat för &ldquo;{fix.productName}&rdquo; men
          köpet saknar kursrader, så ingenting går att boka.
        </DialogDescription>
      </DialogHeader>

      {canBackfill ? (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Följande läggs till på köpet, med samma antal tillfällen som ett
            beviljande hade gett:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            {fix.courseNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          &ldquo;{fix.productName}&rdquo; har inga kurser kopplade, så det finns
          ingenting att hämta. Lägg till kurser i produkten under
          /admin/products först — kom sedan tillbaka hit.
        </div>
      )}

      <DialogFooter>
        <Button onClick={submit} disabled={isPending || !canBackfill}>
          {isPending ? "Hämtar…" : "Hämta från produkt"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Tar bort en bokning som inte borde ligga kvar, och lägger tillbaka klippet.
 * Dialogen säger vad som händer med saldot innan man trycker — det är kundens
 * tillfällen det handlar om, inte bara en rad i en lista.
 */
function RemoveBooking({
  fix,
  onDone,
}: {
  fix: Extract<HealthFix, { kind: "booking-remove" }>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const cancelled = fix.reason === "cancelled";

  const submit = () => {
    startTransition(async () => {
      const result = await removeStaleBooking(
        fix.lessonId,
        fix.purchaseItemId,
        fix.reason,
      );
      if (result.success) {
        toast.success(result.msg);
        onDone();
        router.refresh();
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {cancelled
            ? "Ta bort bokningen på den inställda lektionen"
            : `Ta bort ${fix.removes} dubblett${fix.removes === 1 ? "" : "er"}`}
        </DialogTitle>
        <DialogDescription>
          {fix.studentName} · {fix.courseName} ·{" "}
          {formatShortFriendlyDate(fix.startTime)}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          {cancelled
            ? "Lektionen är inställd, så bokningen ska inte ligga kvar. Den tas bort och klippet läggs tillbaka på elevens saldo."
            : `Samma köp är bokat ${fix.removes + 1} gånger på lektionen. Den första bokningen behålls, ${fix.removes} tas bort och lika många klipp läggs tillbaka.`}
        </p>
        <p>
          Det är samma sak som papperskorgen i närvarodialogen gör. Vill du se
          hela närvarolistan först ligger lektionen bakom länken på raden.
        </p>
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={isPending}>
          {isPending
            ? "Tar bort…"
            : cancelled
              ? "Ta bort bokning"
              : "Ta bort dubbletter"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Skapar köpet på en beviljad order som aldrig fick något. Dialogen är tydlig
 * med sidoeffekterna: det går ett mail till kunden, och gamla lektioner bokas
 * inte in i efterhand.
 */
function CreatePurchase({
  fix,
  onDone,
}: {
  fix: Extract<HealthFix, { kind: "order-purchase" }>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const blocked = fix.missingSelections.length > 0;

  const submit = () => {
    startTransition(async () => {
      const result = await createMissingPurchase(fix.orderId);
      if (result.success) {
        toast.success(result.msg);
        onDone();
        router.refresh();
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Skapa köpet från ordern</DialogTitle>
        <DialogDescription>
          {fix.userName} har en beviljad order utan köp, alltså ingen tillgång
          alls. Knappen gör samma sak som &ldquo;Bevilja&rdquo; hade gjort.
        </DialogDescription>
      </DialogHeader>

      {blocked ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          {fix.missingSelections.join(", ")} är paket där kunden själv väljer
          kurser, och inga val finns sparade på ordern. Skapandet vägrar tills
          valen är gjorda — öppna ordern och spara kursvalen först.
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Följande skapas som köp, med kurser och antal tillfällen från
            produkten:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            {fix.productNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Kunden får godkännandemailet igen, och autobokning bokar bara
            lektioner som ännu inte varit.
          </p>
        </div>
      )}

      <DialogFooter>
        <Button onClick={submit} disabled={isPending || blocked}>
          {isPending ? "Skapar…" : "Skapa köp"}
        </Button>
      </DialogFooter>
    </>
  );
}
