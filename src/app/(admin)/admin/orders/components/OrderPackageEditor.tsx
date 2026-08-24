"use client";

import { useEffect, useState } from "react";
import { SelectPack } from "@/app/(public)/checkout/components/SelectPack";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Course } from "@/generated/prisma/client";

type OrderPackageEditorProps = {
  orderId: string;
  orderItemId: string;
  productName: string;
  maxCourses: number;
  courses: Course[];
  selected: string[];
  onSave: (orderItemId: string, selected: string[]) => Promise<void> | void;
  isSaving?: boolean;
  disabled?: boolean;
  readOnlyMessage?: string;
};

export function OrderPackageEditor({
  orderItemId,
  productName,
  maxCourses,
  courses,
  selected,
  onSave,
  isSaving = false,
  disabled = false,
  readOnlyMessage,
}: OrderPackageEditorProps) {
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    setDraft(selected);
  }, [selected]);

  const handleSave = async () => {
    await onSave(orderItemId, draft);
  };

  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Paketval
      </div>
      {disabled ? (
        <p className="text-xs text-muted-foreground">
          {readOnlyMessage || `Paketet kan inte ändras för ${productName}.`}
        </p>
      ) : (
        <>
          <SelectPack
            maxCourses={maxCourses}
            courses={courses}
            selected={draft}
            onChange={setDraft}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Sparar…" : "Spara paketval"}
          </Button>
        </>
      )}
    </div>
  );
}

type OrderPackageDialogProps = OrderPackageEditorProps & {
  triggerLabel?: string;
  triggerVariant?: "outline" | "secondary" | "ghost";
};

export function OrderPackageDialog({
  orderId,
  orderItemId,
  productName,
  maxCourses,
  courses,
  selected,
  onSave,
  isSaving = false,
  disabled = false,
  readOnlyMessage,
  triggerLabel = "Ändra paket",
  triggerVariant = "outline",
}: OrderPackageDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSave = async (itemId: string, next: string[]) => {
    await onSave(itemId, next);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={disabled}
        >
          {disabled ? "Låst" : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
          <DialogDescription>
            Välj {maxCourses} {maxCourses === 1 ? "kurs" : "kurser"} för detta
            paket.
          </DialogDescription>
        </DialogHeader>
        <OrderPackageEditor
          orderId={orderId}
          orderItemId={orderItemId}
          productName={productName}
          maxCourses={maxCourses}
          courses={courses}
          selected={selected}
          onSave={handleSave}
          isSaving={isSaving}
          disabled={disabled}
          readOnlyMessage={readOnlyMessage}
        />
      </DialogContent>
    </Dialog>
  );
}
