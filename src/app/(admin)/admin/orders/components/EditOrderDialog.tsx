"use client";

import { Edit3Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderEditPayload } from "@/lib/actions/orders";
import type { ParticipantData } from "@/lib/actions/participants";
import { formatPrice } from "@/lib/money";

export type EditableProduct = {
  id: string;
  name: string;
  price: number;
  maxCourses: number | null;
};

type ExistingParticipant = { id: string; name: string; email: string | null };

type OrderForEdit = {
  id: string;
  userId: string;
  customerLabel: string;
  orderItems?:
    | {
        id?: string;
        product: { id: string; name: string; price: number };
        participant?: { id: string; name: string } | null;
      }[]
    | null;
};

type ParticipantChoice = {
  isSelf: boolean;
  participantId?: string;
  customData?: ParticipantData;
};

type Row = {
  id: string;
  kind: "existing" | "new";
  orderItemId?: string;
  productId: string;
  participant: ParticipantChoice;
  deleted: boolean;
};

function emptyParticipantData(): ParticipantData {
  return {
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    allowPhotoVideo: false,
  };
}

/** Normalize a name for fuzzy duplicate comparison */
function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function ParticipantPicker({
  value,
  onChange,
  participants,
  customerLabel,
  allRows,
  currentRowId,
  user,
}: {
  value: ParticipantChoice;
  onChange: (v: ParticipantChoice) => void;
  participants: ExistingParticipant[];
  customerLabel: string;
  allRows: Row[];
  currentRowId: string;
  user: { name: string };
}) {
  const selectValue = value.isSelf
    ? "self"
    : value.customData
      ? "new"
      : value.participantId || "new";

  // Get typed name for duplicate detection
  const typedName = value.customData?.name || "";
  const _normalized = normalizeName(typedName);

  // Check for duplicates
  const dupWarning = getDuplicateWarning(
    currentRowId,
    typedName,
    allRows,
    user.name,
    participants,
  );

  return (
    <div className="space-y-1.5">
      <Select
        value={selectValue}
        onValueChange={(val) => {
          if (val === "self") onChange({ isSelf: true });
          else if (val === "new")
            onChange({ isSelf: false, customData: emptyParticipantData() });
          else onChange({ isSelf: false, participantId: val });
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="self">{customerLabel} (kunden själv)</SelectItem>
          {participants.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
          <SelectItem value="new">+ Ny deltagare</SelectItem>
        </SelectContent>
      </Select>

      {value.customData && (
        <div className="grid grid-cols-2 gap-1.5 rounded-md bg-muted/40 p-2">
          <Input
            className="h-7 text-xs col-span-2"
            placeholder="Namn"
            value={value.customData.name}
            onChange={(e) => {
              if (!value.customData) return;

              onChange({
                ...value,
                customData: { ...value.customData, name: e.target.value },
              });
            }}
          />
          <Input
            className="h-7 text-xs"
            placeholder="E-post (valfritt)"
            value={value.customData.email}
            onChange={(e) => {
              if (!value.customData) return;
              onChange({
                ...value,
                customData: { ...value.customData, email: e.target.value },
              });
            }}
          />
          <Input
            className="h-7 text-xs"
            placeholder="Telefon (valfritt)"
            value={value.customData.phone}
            onChange={(e) => {
              if (!value.customData) return;
              onChange({
                ...value,
                customData: { ...value.customData, phone: e.target.value },
              });
            }}
          />
          <Input
            className="h-7 text-xs col-span-2"
            type="date"
            value={value.customData.dateOfBirth}
            onChange={(e) => {
              if (!value.customData) return;
              onChange({
                ...value,
                customData: {
                  ...value.customData,
                  dateOfBirth: e.target.value,
                },
              });
            }}
          />

          {dupWarning && (
            <div className="col-span-2 mt-1 flex flex-col gap-2 rounded-md border border-amber-400/60 bg-amber-50 px-2.5 py-2 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
              <p className="text-[10px] font-medium">
                {dupWarning.type === "slot"
                  ? `Dubblett: "${dupWarning.match.name}" finns i en annan rad.`
                  : dupWarning.type === "db"
                    ? `Dubblett: "${dupWarning.match.name}" finns bland sparade deltagare.`
                    : `Dubblett: "${dupWarning.match.name}" är kunden själv.`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dupWarning.type === "db" && dupWarning.match.id && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        isSelf: false,
                        participantId: dupWarning.match.id,
                        customData: undefined,
                      })
                    }
                    className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-300 transition-colors dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
                  >
                    Använd befintlig
                  </button>
                )}
                {dupWarning.type === "self" && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        isSelf: true,
                        participantId: undefined,
                        customData: undefined,
                      })
                    }
                    className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-300 transition-colors dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
                  >
                    Använd kunden själv
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Returns duplicate warning for a given row's typed name */
function getDuplicateWarning(
  currentRowId: string,
  typedName: string,
  allRows: Row[],
  userName: string,
  participants: ExistingParticipant[],
): {
  type: "db" | "slot" | "self";
  match: { id?: string; name: string; rowId?: string };
} | null {
  const normalized = normalizeName(typedName);
  if (!normalized) return null;

  // Check against user
  if (normalizeName(userName) === normalized) {
    return { type: "self", match: { name: userName } };
  }

  // Check against existing participants
  const dbMatch = participants.find(
    (p) => normalizeName(p.name) === normalized,
  );
  if (dbMatch) {
    return { type: "db", match: { id: dbMatch.id, name: dbMatch.name } };
  }

  // Check against other rows
  for (const row of allRows) {
    if (row.id === currentRowId) continue;
    if (row.deleted) continue;
    if (row.participant.isSelf) continue;
    const otherName = row.participant.customData?.name || "";
    if (otherName && normalizeName(otherName) === normalized) {
      return { type: "slot", match: { name: otherName, rowId: row.id } };
    }
  }

  return null;
}

export function EditOrderDialog({
  order,
  products,
  onSave,
  getParticipantsForUser,
  createParticipant,
  disabled,
  userName,
}: {
  order: OrderForEdit;
  products: EditableProduct[];
  onSave: (
    orderId: string,
    payload: OrderEditPayload,
  ) => Promise<{ success: boolean; msg?: string }>;
  getParticipantsForUser: (userId: string) => Promise<ExistingParticipant[]>;
  createParticipant: (
    data: ParticipantData,
  ) => Promise<{ id: string; name: string }>;
  disabled?: boolean;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participants, setParticipants] = useState<ExistingParticipant[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState(1);

  const seed = async () => {
    setRows(
      (order.orderItems ?? [])
        .filter((oi): oi is typeof oi & { id: string } => !!oi.id)
        .map((oi) => ({
          id: oi.id,
          kind: "existing" as const,
          orderItemId: oi.id,
          productId: oi.product.id,
          participant: oi.participant
            ? { isSelf: false, participantId: oi.participant.id }
            : { isSelf: true },
          deleted: false,
        })),
    );

    setLoadingParticipants(true);
    try {
      const list = await getParticipantsForUser(order.userId);
      const merged = [...list];
      for (const oi of order.orderItems ?? []) {
        if (
          oi.participant &&
          !merged.some((p) => p.id === oi.participant?.id)
        ) {
          merged.push({
            id: oi.participant.id,
            name: oi.participant.name,
            email: null,
          });
        }
      }
      setParticipants(merged);
    } catch {
      toast.error("Kunde inte hämta deltagare.");
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) void seed();
    else {
      setAddProductId("");
      setAddQty(1);
    }
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleAddProduct = () => {
    if (!addProductId) return;
    const newRows: Row[] = Array.from({ length: addQty }).map(() => ({
      id: crypto.randomUUID(),
      kind: "new",
      productId: addProductId,
      participant: { isSelf: true },
      deleted: false,
    }));
    setRows((prev) => [...prev, ...newRows]);
    setAddProductId("");
    setAddQty(1);
  };

  const productPrice = (productId: string) =>
    products.find((p) => p.id === productId)?.price ?? 0;

  const activeRows = rows.filter((r) => !r.deleted);
  const total = activeRows.reduce(
    (sum, r) => sum + productPrice(r.productId),
    0,
  );

  // Check for duplicates among active rows
  const hasDuplicates = activeRows.some((row) => {
    if (row.participant.isSelf) return false;
    const isNewForm =
      row.participant.participantId === undefined ||
      row.participant.participantId === "new";
    const typedName = row.participant.customData?.name || "";
    return (
      isNewForm &&
      getDuplicateWarning(
        row.id,
        typedName,
        activeRows,
        userName,
        participants,
      ) !== null
    );
  });

  const resolveParticipantId = async (
    choice: ParticipantChoice,
  ): Promise<string | null> => {
    if (choice.isSelf) return null;
    if (choice.participantId) return choice.participantId;
    if (choice.customData) {
      if (!choice.customData.name.trim()) {
        throw new Error("Namn saknas för en ny deltagare.");
      }
      const created = await createParticipant(choice.customData);
      return created.id;
    }
    throw new Error("Ingen deltagare vald för en rad.");
  };

  const handleSave = async () => {
    if (activeRows.length === 0) {
      toast.error("Ordern måste ha minst en produkt kvar.");
      return;
    }

    if (hasDuplicates) {
      toast.error(
        "Det finns dubletter av deltagare. Vänligen åtgärda innan du sparar.",
      );
      return;
    }

    setSaving(true);
    try {
      const updates: OrderEditPayload["updates"] = [];
      const creates: OrderEditPayload["creates"] = [];

      for (const row of activeRows) {
        const participantId = await resolveParticipantId(row.participant);
        if (row.kind === "existing") {
          if (!row.orderItemId) {
            throw new Error("Befintlig rad saknar orderItemId.");
          }
          updates.push({
            orderItemId: row.orderItemId,
            productId: row.productId,
            participantId,
          });
        } else {
          creates.push({ productId: row.productId, participantId });
        }
      }

      const res = await onSave(order.id, {
        updates,
        creates,
        deletes: rows
          .filter(
            (r): r is Row & { orderItemId: string } =>
              r.deleted && r.kind === "existing" && !!r.orderItemId,
          )
          .map((r) => r.orderItemId),
      });

      if (res.success) {
        toast.success("Ordern har uppdaterats!");
        setOpen(false);
      } else {
        toast.error(res.msg || "Kunde inte uppdatera ordern.");
      }
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ||
        "Ett fel uppstod när ordern skulle sparas.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-7 w-full justify-start px-2 text-[11px] gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 shadow-none font-normal transition-colors"
        >
          <Edit3Icon /> {disabled ? "Låst" : "Ändra order"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ändra order</DialogTitle>
          <DialogDescription>
            Byt produkt eller deltagare, ta bort rader, eller lägg till nya
            produkter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Ordern har inga rader.
            </p>
          )}
          {rows.map((row, i) => (
            <div
              key={row.id}
              className={`rounded-md border p-3 space-y-2 ${
                row.deleted ? "opacity-40" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  #{i}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-destructive"
                  onClick={() =>
                    row.kind === "new"
                      ? setRows((prev) => prev.filter((r) => r.id !== row.id))
                      : updateRow(row.id, { deleted: !row.deleted })
                  }
                >
                  <Trash2Icon className="h-3 w-3 mr-1" />
                  {row.deleted ? "Ångra" : "Ta bort"}
                </Button>
              </div>

              {!row.deleted && (
                <div className="space-y-2">
                  <Select
                    value={row.productId}
                    onValueChange={(val) =>
                      updateRow(row.id, { productId: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatPrice(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ParticipantPicker
                    value={row.participant}
                    onChange={(v) => updateRow(row.id, { participant: v })}
                    participants={participants}
                    customerLabel={order.customerLabel}
                    allRows={activeRows}
                    currentRowId={row.id}
                    user={{ name: userName }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="rounded-md border border-dashed p-3 space-y-2">
            <span className="text-xs font-medium">Lägg till produkt</span>
            <div className="flex gap-2">
              <Select value={addProductId} onValueChange={setAddProductId}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Välj produkt" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatPrice(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) =>
                  setAddQty(Math.max(1, Number(e.target.value) || 1))
                }
                className="h-8 w-16 text-xs"
              />
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={handleAddProduct}
                disabled={!addProductId}
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Lägg till
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Antal &gt; 1 skapar flera separata rader — en deltagare väljs per
              rad.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2 pt-2">
          <span className="text-sm font-semibold">
            Ny totalsumma: {formatPrice(total)}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={saving || loadingParticipants || hasDuplicates}
            onClick={handleSave}
          >
            {saving ? "Sparar..." : "Spara"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
