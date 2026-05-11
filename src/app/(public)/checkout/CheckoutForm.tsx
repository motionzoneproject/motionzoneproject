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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    allowPhotoVideo: boolean;
    userId?: string | null;
  }[];
};

type SlotData = {
  isSelf: boolean;
  participantId?: string; // used if selecting existing
  customData?: ParticipantData; // used if creating new
};

export default function CheckoutForm({
  items,
  user,
  userDetails,
  existingParticipants,
}: CheckoutFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [note, setNote] = useState("");
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

                      {(slot.participantId === "new" ||
                        !slot.participantId) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-1">
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
                                    allowPhotoVideo:
                                      slot.customData?.allowPhotoVideo || false,
                                  },
                                })
                              }
                            />
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
                                    phone: e.target.value,
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
              disabled={isSubmitting}
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
