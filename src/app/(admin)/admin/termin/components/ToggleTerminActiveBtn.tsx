"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TerminCascadeImpact } from "@/lib/actions/admin";
import { toggleTerminActive } from "@/lib/actions/admin";

interface Props {
  terminId: string;
  terminName: string;
  active: boolean;
  impact: TerminCascadeImpact;
}

function ImpactList({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({items.length})
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-sm">
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ToggleTerminActiveBtn({
  terminId,
  terminName,
  active,
  impact,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alsoToggleLinked, setAlsoToggleLinked] = useState(true);

  const hasImpact = impact.courses.length > 0 || impact.products.length > 0;

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const { success, msg } = await toggleTerminActive(
          terminId,
          !active,
          !active && alsoToggleLinked,
        );
        if (!success) {
          toast.error(msg);
          return;
        }
        toast.success(msg);
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error("Kunde inte ändra terminstatus.");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={active ? "Avaktivera (dölj för kunder)" : "Aktivera"}
        >
          {active ? (
            <EyeOffIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {active ? "Avaktivera termin" : "Aktivera termin"}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90dvh] overflow-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {active
              ? `Avaktivera "${terminName}"?`
              : `Aktivera "${terminName}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {active
              ? "Terminen döljs för kunder. Kurser och produkter som inte längre hör till någon annan aktiv termin avaktiveras automatiskt, eftersom de annars går att köpa utan att kunna bokas."
              : "Terminen blir synlig och bokningsbar för kunder igen."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {active && hasImpact && (
          <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Detta avaktiveras automatiskt:
            </p>
            <ImpactList title="Kurser" items={impact.courses} />
            <ImpactList title="Produkter" items={impact.products} />
          </div>
        )}

        {!active && hasImpact && (
          <label
            htmlFor={`also-toggle-linked-${terminId}`}
            className="flex items-start gap-2 rounded-md border p-3 text-sm"
          >
            <Checkbox
              id={`also-toggle-linked-${terminId}`}
              checked={alsoToggleLinked}
              onCheckedChange={(checked) =>
                setAlsoToggleLinked(checked === true)
              }
              className="mt-0.5"
            />
            <span>
              Återaktivera även {impact.courses.length} kurs
              {impact.courses.length === 1 ? "" : "er"} och{" "}
              {impact.products.length} produkt
              {impact.products.length === 1 ? "" : "er"} som hör till terminen.
            </span>
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {active ? "Avaktivera" : "Aktivera"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
