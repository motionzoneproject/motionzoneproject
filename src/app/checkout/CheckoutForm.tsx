"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  participantId?: string; // used if selecting existing/draft
};

export default function CheckoutForm({
  items,
  user,
  userDetails,
  existingParticipants,
}: CheckoutFormProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftParticipants, setDraftParticipants] = useState<
    {
      id: string;
      name: string;
      data: ParticipantData;
    }[]
  >([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSlotKey, setDialogSlotKey] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState<ParticipantData>({
    name: "",
    email: "",
    phone: "",
    allowPhotoVideo: false,
  });

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

  const getParticipantKey = (data: ParticipantData) => {
    const norm = (value?: string) => (value ?? "").trim().toLowerCase();
    return [norm(data.name), norm(data.email), norm(data.phone)].join("|");
  };

  const updateSlot = (key: string, data: Partial<SlotData>) => {
    setSlots((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...data },
    }));
  };

  const openParticipantDialog = (key: string) => {
    setDialogSlotKey(key);
    setNewParticipant({
      name: "",
      email: "",
      phone: "",
      allowPhotoVideo: false,
    });
    setDialogOpen(true);
  };

  const handleAddParticipant = () => {
    if (!dialogSlotKey) return;

    if (!newParticipant.name?.trim()) {
      toast.error("Ange namn för deltagaren.");
      return;
    }

    const key = getParticipantKey(newParticipant);
    const existingMatch = existingParticipants.find(
      (p) =>
        getParticipantKey({
          name: p.name,
          email: p.email ?? undefined,
          phone: p.phone ?? undefined,
          allowPhotoVideo: p.allowPhotoVideo,
          userId: p.userId ?? undefined,
        }) === key,
    );
    const draftMatch = draftParticipants.find(
      (p) => getParticipantKey(p.data) === key,
    );

    if (existingMatch) {
      updateSlot(dialogSlotKey, {
        participantId: existingMatch.id,
        isSelf: false,
      });
      toast.info("Deltagaren fanns redan sparad, vi använder den befintliga.");
      setDialogOpen(false);
      return;
    }

    if (draftMatch) {
      updateSlot(dialogSlotKey, {
        participantId: draftMatch.id,
        isSelf: false,
      });
      toast.info(
        "Deltagaren fanns redan i denna beställning, vi använder den.",
      );
      setDialogOpen(false);
      return;
    }

    const draftId = `draft-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    setDraftParticipants((prev) => [
      ...prev,
      { id: draftId, name: newParticipant.name.trim(), data: newParticipant },
    ]);
    updateSlot(dialogSlotKey, { participantId: draftId, isSelf: false });
    setDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const orderItems = [];
      // Håller koll på skapade deltagare i denna order (draft-id -> participant-id).
      const draftMap = new Map<string, string>();
      // Dedupe per deltagare (namn+email+telefon) så vi återanvänder samma person. (så inte fler av samma skapas)
      const participantKeyMap = new Map<string, string>();

      // Förifyllt uppslag mot redan sparade deltagare.
      const existingParticipantByKey = new Map<string, string>(
        existingParticipants.map((p) => [
          getParticipantKey({
            name: p.name,
            email: p.email ?? undefined,
            phone: p.phone ?? undefined,
            allowPhotoVideo: p.allowPhotoVideo,
            userId: p.userId ?? undefined,
          }),
          p.id,
        ]),
      );

      for (let idx = 0; idx < flattenedItems.length; idx++) {
        const it = flattenedItems[idx];
        const key = `slot-${idx}`;
        const slot = slots[key] || { isSelf: false };
        let participantId: string | null = null;

        if (slot.isSelf) {
          // It's the user themselves.
          const p = await getOrCreateParticipant({
            name: user.name,
            email: user.email,
            allowPhotoVideo: userDetails?.allowPhotoVideo ?? false,
            userId: user.id,
          });
          participantId = p.id;
        } else if (slot.participantId) {
          if (slot.participantId.startsWith("draft-")) {
            // Deltagare skapad i denna beställning (i dialogen), återanvänd om redan skapad.
            const draft = draftParticipants.find(
              (p) => p.id === slot.participantId,
            );
            if (!draft) {
              toast.error(`Välj deltagare för ${it.name}`);
              setIsSubmitting(false);
              return;
            }
            const key = getParticipantKey(draft.data);
            const existingByKey = participantKeyMap.get(key);
            const existing =
              existingByKey ??
              existingParticipantByKey.get(key) ??
              draftMap.get(draft.id);
            if (existing) {
              participantId = existing;
            } else {
              // Skapa en riktig participant och memoize för resten av ordern.
              const p = await getOrCreateParticipant(draft.data);
              participantId = p.id;
              draftMap.set(draft.id, p.id);
              participantKeyMap.set(key, p.id);
            }
          } else {
            participantId = slot.participantId;
          }
        } else {
          toast.error(`Välj deltagare för ${it.name}`);
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

      toast.success("Beställning skapad!");
      router.push(result.successRedirect);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ett fel uppstod";
      toast.error("Ett fel uppstod", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slutför köp & Deltagare</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Vilka ska delta?
            </h3>
            {flattenedItems.map((it, idx) => {
              const key = `slot-${idx}`;
              const slot = slots[key] || { isSelf: false };
              const draftOptions = draftParticipants;

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
                        Jag själv
                      </Label>
                      <Checkbox
                        id={`self-${key}`}
                        checked={slot.isSelf}
                        onCheckedChange={(val) =>
                          updateSlot(key, {
                            isSelf: !!val,
                            participantId: val ? undefined : slot.participantId,
                          })
                        }
                      />
                    </div>
                  </div>

                  {!slot.isSelf && (
                    <div className="space-y-4 pt-2 border-t border-dashed">
                      <div className="space-y-2">
                        <Label>Välj deltagare</Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={slot.participantId}
                            onValueChange={(val) =>
                              updateSlot(key, {
                                participantId: val,
                                isSelf: false,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Välj deltagare" />
                            </SelectTrigger>
                            <SelectContent>
                              {draftOptions.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>
                                    Nya i denna beställning
                                  </SelectLabel>
                                  {draftOptions.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {otherParticipants.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Sparade deltagare</SelectLabel>
                                  {otherParticipants.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {draftOptions.length === 0 &&
                                otherParticipants.length === 0 && (
                                  <SelectItem disabled value="none">
                                    Inga deltagare ännu
                                  </SelectItem>
                                )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openParticipantDialog(key)}
                          >
                            Lägg till
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="note">Notering till beställningen</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="t.ex. speciella önskemål"
              className="resize-none"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand hover:bg-brand-light text-white font-medium h-12 text-lg"
            >
              {isSubmitting ? "Behandlar..." : "Slutför beställning"}
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Genom att slutföra köpet godkänner du våra köpvillkor.
            </p>
          </div>
        </form>
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lägg till deltagare</DialogTitle>
            <DialogDescription>
              Deltagaren sparas i denna beställning och kan väljas för andra
              produkter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Namn*</Label>
              <Input
                placeholder="Fullständigt namn"
                value={newParticipant.name || ""}
                onChange={(e) =>
                  setNewParticipant((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">E-post (valfri)</Label>
              <Input
                type="email"
                placeholder="epost@exempel.se"
                value={newParticipant.email || ""}
                onChange={(e) =>
                  setNewParticipant((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefon (valfri)</Label>
              <Input
                placeholder="070-000 00 00"
                value={newParticipant.phone || ""}
                onChange={(e) =>
                  setNewParticipant((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Checkbox
                id="dialog-photo"
                checked={newParticipant.allowPhotoVideo || false}
                onCheckedChange={(val) =>
                  setNewParticipant((prev) => ({
                    ...prev,
                    allowPhotoVideo: !!val,
                  }))
                }
              />
              <Label htmlFor="dialog-photo" className="text-xs leading-none">
                Godkänner fotografering/filmning för sociala medier
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleAddParticipant}
            >
              Lägg till
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
