"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useState,
  useTransition,
} from "react";
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
import type {
  CascadeImpactItem,
  TerminCascadeImpact,
} from "@/lib/actions/admin";
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
  items: CascadeImpactItem[];
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

function SelectableImpactList({
  title,
  items,
  idPrefix,
  selectedIds,
  onToggle,
}: {
  title: string;
  items: CascadeImpactItem[];
  idPrefix: string;
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({items.length})
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <label
              htmlFor={`${idPrefix}-${item.id}`}
              className="flex items-start gap-2 text-sm"
            >
              <Checkbox
                id={`${idPrefix}-${item.id}`}
                checked={selectedIds.includes(item.id)}
                onCheckedChange={(checked) =>
                  onToggle(item.id, checked === true)
                }
                className="mt-0.5"
              />
              <span>{item.name}</span>
            </label>
          </li>
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
  const [open, setOpen] = useState(false);
  // Urkryssad som default: att publicera saker igen ska vara ett aktivt val.
  const [alsoToggleLinked, setAlsoToggleLinked] = useState(false);
  const [pickedCourseIds, setPickedCourseIds] = useState<string[]>([]);
  const [pickedProductIds, setPickedProductIds] = useState<string[]>([]);

  const togglePicked =
    (setPicked: Dispatch<SetStateAction<string[]>>) =>
    (id: string, checked: boolean) =>
      setPicked((prev) =>
        checked ? [...prev, id] : prev.filter((prevId) => prevId !== id),
      );

  const hasCascadeImpact =
    impact.courses.length > 0 || impact.products.length > 0;
  const hasManualImpact =
    impact.manualCourses.length > 0 || impact.manualProducts.length > 0;

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const { success, msg } = await toggleTerminActive(
          terminId,
          !active,
          !active && alsoToggleLinked,
          active ? [] : pickedCourseIds,
          active ? [] : pickedProductIds,
        );
        if (!success) {
          toast.error(msg);
          return;
        }
        toast.success(msg);
        setOpen(false);
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error("Kunde inte ändra terminstatus.");
      }
    });
  };

  // Nollställ valen när dialogen stängs, så att en avbruten runda inte ligger
  // kvar ikryssad nästa gång.
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setAlsoToggleLinked(false);
      setPickedCourseIds([]);
      setPickedProductIds([]);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
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

        {active && hasCascadeImpact && (
          <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Detta avaktiveras automatiskt:
            </p>
            <ImpactList title="Kurser" items={impact.courses} />
            <ImpactList title="Produkter" items={impact.products} />
          </div>
        )}

        {!active && hasCascadeImpact && (
          <div className="space-y-2">
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
                Återaktivera även{" "}
                {[
                  impact.courses.length > 0 &&
                    `${impact.courses.length} kurs${impact.courses.length === 1 ? "" : "er"}`,
                  impact.products.length > 0 &&
                    `${impact.products.length} produkt${impact.products.length === 1 ? "" : "er"}`,
                ]
                  .filter(Boolean)
                  .join(" och ")}{" "}
                som stängdes av när terminen avaktiverades.
              </span>
            </label>
            <div className="space-y-3 rounded-md border p-3">
              <ImpactList title="Kurser" items={impact.courses} />
              <ImpactList title="Produkter" items={impact.products} />
            </div>
          </div>
        )}

        {!active && hasManualImpact && (
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium text-muted-foreground">
              Avaktiverades manuellt och lämnas kvar som inaktiva. Kryssa i det
              som ändå ska tillbaka:
            </p>
            <SelectableImpactList
              title="Kurser"
              items={impact.manualCourses}
              idPrefix={`manual-course-${terminId}`}
              selectedIds={pickedCourseIds}
              onToggle={togglePicked(setPickedCourseIds)}
            />
            <SelectableImpactList
              title="Produkter"
              items={impact.manualProducts}
              idPrefix={`manual-product-${terminId}`}
              selectedIds={pickedProductIds}
              onToggle={togglePicked(setPickedProductIds)}
            />
          </div>
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
