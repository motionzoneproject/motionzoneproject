"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCheckout } from "@/lib/actions/checkout";
import {
  getOrCreateParticipant,
  type ParticipantData,
} from "@/lib/actions/participants";
import { formatDateToInputStr } from "@/lib/date-utils";

type CheckoutFormProps = {
  items: {
    productId: string;
    name: string;
    qty: number;
    price: number;
  }[];
  user: {
    id: string;
    name: string;
    email: string;
  };
  userDetails?: {
    postalCode?: string | null;
    allowPhotoVideo?: boolean | null;
  } | null;
  existingParticipants: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    allowPhotoVideo: boolean;
    userId?: string | null;
  }[];
};

type SlotData = {
  isSelf: boolean;
  participantId?: string; // used if selecting existing
  customData?: ParticipantData; // used if creating new
};

/** Normalize a name for fuzzy duplicate comparison */
function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function CheckoutForm({
  items,
  user,
  userDetails,
  existingParticipants,
}: CheckoutFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [paymethod, setPaymethod] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded items (each qty gets its own slot)
  const flattenedItems = items.flatMap((it) =>
    Array.from({ length: it.qty }).map((_, idx) => ({
      ...it,
      slotIndex: idx,
    })),
  );

  // State for each slot
  const [slots, setSlots] = useState<Record<string, SlotData>>(
    Object.fromEntries(
      flattenedItems.map((_, idx) => [
        `slot-${idx}`,
        { isSelf: idx === 0 }, // Default only THE first item in cart to self
      ]),
    ),
  );

  // Filter out the current user from the existing participants dropdown
  // because we have the "Jag själv" checkbox for that.
  const otherParticipants = existingParticipants.filter((p) => {
    const isMainUser =
      p.userId === user.id || (p.email && p.email === user.email);
    return !isMainUser;
  });

  const updateSlot = (key: string, data: Partial<SlotData>) => {
    setSlots((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...data },
    }));
  };

  /**
   * Returns duplicate warnings for a given slot's typed name.
   * Checks against:
   *  1. The logged-in user's own name
   *  2. existingParticipants from the database
   *  3. Other slots in this same order that already have a name
   */
  function getDuplicateWarning(
    currentKey: string,
    typedName: string,
    currentSlots: Record<string, SlotData>,
  ): {
    type: "db" | "slot" | "self";
    match: { id?: string; name: string; slotKey?: string };
  } | null {
    const normalized = normalizeName(typedName);
    if (!normalized) return null;

    // Check against the logged-in user's name
    if (normalizeName(user.name) === normalized) {
      return { type: "self", match: { name: user.name } };
    }

    // Check against existing DB participants
    const dbMatch = otherParticipants.find(
      (p) => normalizeName(p.name) === normalized,
    );
    if (dbMatch) {
      return { type: "db", match: { id: dbMatch.id, name: dbMatch.name } };
    }

    // Check against other slots in the same form that have a custom name
    for (const [slotKey, slot] of Object.entries(currentSlots)) {
      if (slotKey === currentKey) continue;
      if (slot.isSelf) continue;
      const otherName = slot.customData?.name || "";
      if (otherName && normalizeName(otherName) === normalized) {
        return { type: "slot", match: { name: otherName, slotKey } };
      }
    }

    return null;
  }

  // Derived state: check if there are any duplicate warnings across all slots
  const hasDuplicates = flattenedItems.some((_, idx) => {
    const key = `slot-${idx}`;
    const slot = slots[key] || { isSelf: false };
    const isNewForm = slot.participantId === "new" || !slot.participantId;
    const typedName = slot.customData?.name || "";
    return (
      !slot.isSelf &&
      isNewForm &&
      getDuplicateWarning(key, typedName, slots) !== null
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const orderItems = [];

      for (let idx = 0; idx < flattenedItems.length; idx++) {
        const it = flattenedItems[idx];
        const key = `slot-${idx}`;
        const slot = slots[key] || { isSelf: false };
        let participantId: string | null = null;

        if (slot.isSelf) {
          // It's the user themselves, keep participant null.
          participantId = null;
        } else if (slot.participantId && slot.participantId !== "new") {
          participantId = slot.participantId;
        } else if (slot.customData) {
          if (!slot.customData.name) {
            toast.error(
              t("checkout.form.missingNameForProduct", { name: it.name }),
            );
            setIsSubmitting(false);
            return;
          }

          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (
            !slot.customData.dateOfBirth ||
            !dateRegex.test(slot.customData.dateOfBirth) ||
            Number.isNaN(new Date(slot.customData.dateOfBirth).getTime())
          ) {
            throw new Error(
              `Ogiltigt eller saknat födelsedatum för deltagare till ${it.name}.`,
            );
          }

          const p = await getOrCreateParticipant(slot.customData);
          participantId = p.id;
        } else {
          toast.error(
            t("checkout.form.missingParticipantForProduct", { name: it.name }),
          );
          setIsSubmitting(false);
          return;
        }

        orderItems.push({
          productId: it.productId,
          count: 1, // We treat each as 1 count since we gave each a participant
          price: it.price,
          participantId,
        });
      }

      const result = await createCheckout({
        items: orderItems,
        postalcode: userDetails?.postalCode || undefined,
        note,
        paymethod: Number(paymethod),
      });

      toast.success(t("checkout.form.orderCreated"));
      router.push(result.successRedirect);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("checkout.form.errorGeneric");
      toast.error(t("checkout.form.errorTitle"), { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("checkout.form.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-2">
          {t("checkout.form.intro")}
        </CardDescription>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("checkout.form.whoAttends")}
            </h3>
            {flattenedItems.map((it, idx) => {
              const key = `slot-${idx}`;
              const slot = slots[key] || { isSelf: false };
              const isNewForm =
                slot.participantId === "new" || !slot.participantId;
              const typedName = slot.customData?.name || "";
              const dupWarning =
                !slot.isSelf && isNewForm
                  ? getDuplicateWarning(key, typedName, slots)
                  : null;

              return (
                <div
                  key={key}
                  className="p-4 border rounded-lg space-y-4 bg-muted/30"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{it.name}</p>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`self-${key}`}
                        className="text-sm cursor-pointer"
                      >
                        {t("checkout.form.myself")}
                      </Label>
                      <Checkbox
                        id={`self-${key}`}
                        checked={slot.isSelf}
                        onCheckedChange={(val) =>
                          updateSlot(key, { isSelf: !!val })
                        }
                      />
                    </div>
                  </div>

                  {!slot.isSelf && (
                    <div className="space-y-4 pt-2 border-t border-dashed">
                      <div className="space-y-2">
                        <Label>{t("checkout.form.selectExistingOrNew")}</Label>
                        <Select
                          value={slot.participantId || "new"}
                          onValueChange={(val) =>
                            updateSlot(key, { participantId: val })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("checkout.form.selectPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">
                              {t("checkout.form.newPerson")}
                            </SelectItem>
                            {otherParticipants.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {isNewForm && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs" htmlFor={`name-${key}`}>
                              {t("checkout.form.name")}
                            </Label>
                            <Input
                              id={`name-${key}`}
                              placeholder={t("checkout.form.namePlaceholder")}
                              value={slot.customData?.name || ""}
                              onChange={(e) =>
                                updateSlot(key, {
                                  customData: {
                                    name: e.target.value,
                                    email: slot.customData?.email || "",
                                    phone: slot.customData?.phone || "",
                                    dateOfBirth:
                                      formatDateToInputStr(
                                        slot.customData?.dateOfBirth,
                                      ) || "",
                                    allowPhotoVideo:
                                      slot.customData?.allowPhotoVideo || false,
                                  },
                                })
                              }
                            />

                            {/* ── Duplicate warning banner ── */}
                            {dupWarning && (
                              <div className="mt-2 flex flex-col gap-2 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300 animate-in fade-in slide-in-from-top-1">
                                <p className="text-xs font-medium">
                                  {dupWarning.type === "slot"
                                    ? t("checkout.form.duplicateWarningSlot", {
                                        name: dupWarning.match.name,
                                      })
                                    : t("checkout.form.duplicateWarningDb", {
                                        name: dupWarning.match.name,
                                      })}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {dupWarning.type === "db" &&
                                    dupWarning.match.id && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSlot(key, {
                                            participantId: dupWarning.match.id,
                                            customData: undefined,
                                          })
                                        }
                                        className="rounded bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300 transition-colors dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
                                      >
                                        {t(
                                          "checkout.form.duplicateUseExisting",
                                          { name: dupWarning.match.name },
                                        )}
                                      </button>
                                    )}
                                  {dupWarning.type === "self" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateSlot(key, {
                                          isSelf: true,
                                          customData: undefined,
                                          participantId: undefined,
                                        })
                                      }
                                      className="rounded bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300 transition-colors dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
                                    >
                                      {t("checkout.form.duplicateUseSelf")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs" htmlFor={`email-${key}`}>
                              {t("checkout.form.emailOptional")}
                            </Label>
                            <Input
                              id={`email-${key}`}
                              type="email"
                              placeholder={t("checkout.form.emailPlaceholder")}
                              value={slot.customData?.email || ""}
                              onChange={(e) =>
                                updateSlot(key, {
                                  customData: {
                                    name: slot.customData?.name || "",
                                    email: e.target.value,
                                    phone: slot.customData?.phone || "",
                                    dateOfBirth:
                                      formatDateToInputStr(
                                        slot.customData?.dateOfBirth,
                                      ) || "",
                                    allowPhotoVideo:
                                      slot.customData?.allowPhotoVideo || false,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs" htmlFor={`phone-${key}`}>
                              {t("checkout.form.phoneOptional")}
                            </Label>
                            <Input
                              id={`phone-${key}`}
                              placeholder={t("checkout.form.phonePlaceholder")}
                              value={slot.customData?.phone || ""}
                              onChange={(e) =>
                                updateSlot(key, {
                                  customData: {
                                    name: slot.customData?.name || "",
                                    email: slot.customData?.email || "",
                                    dateOfBirth:
                                      formatDateToInputStr(
                                        slot.customData?.dateOfBirth,
                                      ) || "",
                                    phone: e.target.value,
                                    allowPhotoVideo:
                                      slot.customData?.allowPhotoVideo || false,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              className="text-xs"
                              htmlFor={`dateOfBirth-${key}`}
                            >
                              {t("checkout.form.dateOfBirth")}
                            </Label>
                            <Input
                              id={`dateOfBirth-${key}`}
                              type="date"
                              value={slot.customData?.dateOfBirth || ""}
                              onChange={(e) =>
                                updateSlot(key, {
                                  customData: {
                                    name: slot.customData?.name || "",
                                    email: slot.customData?.email || "",
                                    dateOfBirth:
                                      formatDateToInputStr(e.target.value) ||
                                      "",
                                    phone: slot.customData?.phone,
                                    allowPhotoVideo:
                                      slot.customData?.allowPhotoVideo || false,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center gap-3 sm:col-span-2">
                            <Checkbox
                              id={`photo-${key}`}
                              checked={
                                slot.customData?.allowPhotoVideo || false
                              }
                              onCheckedChange={(val) =>
                                updateSlot(key, {
                                  customData: {
                                    name: slot.customData?.name || "",
                                    email: slot.customData?.email || "",
                                    dateOfBirth:
                                      formatDateToInputStr(
                                        slot.customData?.dateOfBirth,
                                      ) || "",
                                    phone: slot.customData?.phone || "",
                                    allowPhotoVideo: !!val,
                                  },
                                })
                              }
                            />
                            <Label
                              htmlFor={`photo-${key}`}
                              className="text-xs leading-none"
                            >
                              {t("checkout.form.allowPhoto")}
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="paymethod" className="mb-4">
              {t("checkout.form.method")} ({paymethod})
            </Label>
            <RadioGroup
              defaultValue="1"
              className="w-fit"
              onValueChange={(e) => setPaymethod(e)}
            >
              <Field orientation="horizontal">
                <RadioGroupItem value="1" id="paymethod-r1" />
                <FieldContent>
                  <FieldLabel htmlFor="desc-r1">
                    {t("checkout.form.1")}
                  </FieldLabel>
                  <FieldDescription>
                    {t("checkout.form.1description")}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem value="2" id="paymethod-r2" />
                <FieldContent>
                  <FieldLabel htmlFor="desc-r2">
                    {t("checkout.form.2")}
                  </FieldLabel>
                  <FieldDescription>
                    {t("checkout.form.2description")}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem value="3" id="paymethod-r3" />
                <FieldContent>
                  <FieldLabel htmlFor="desc-r3">
                    {t("checkout.form.3")}
                  </FieldLabel>
                  <FieldDescription>
                    {t("checkout.form.3description")}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </RadioGroup>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="note">{t("checkout.form.noteLabel")}</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t("checkout.form.notePlaceholder")}
              className="resize-none"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={
                isSubmitting || flattenedItems.length === 0 || hasDuplicates
              }
              className="w-full bg-brand hover:bg-brand-light text-white font-medium h-12 text-lg"
            >
              {isSubmitting
                ? t("checkout.form.submitting")
                : t("checkout.form.submit")}
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t("checkout.form.terms")}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
