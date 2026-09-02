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
  grantTeacherRole,
  mergeParticipants,
} from "@/lib/actions/health-actions";
import type { HealthFix, ParticipantCopy } from "@/lib/admin-health";
import { formatShortFriendlyDate } from "@/lib/date-utils";

export function FixDialog({ fix }: { fix: HealthFix }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Wrench className="h-4 w-4" />
          Åtgärda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {fix.kind === "participant-merge" ? (
          <MergeParticipants
            copies={fix.copies}
            onDone={() => setOpen(false)}
          />
        ) : (
          <GrantTeacherRole fix={fix} onDone={() => setOpen(false)} />
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
