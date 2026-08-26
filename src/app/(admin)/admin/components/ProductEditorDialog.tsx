"use client";

import { EditIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course } from "@/generated/prisma/client";
import { getAllCourses } from "@/lib/actions/admin";
import { adminUpdatePurchaseRemainingCount } from "@/lib/actions/admin-students";
import {
  adminChangePurchaseItemCourse,
  getPurchaseFromOrder,
  getPurchasesForStudent,
  type OrderPurchaseForAdmin,
} from "@/lib/actions/orders";
import { getCourseName } from "@/lib/tools";

type ProductEditorDialogProps = (
  | { scope: "order"; orderId: string }
  | { scope: "student"; userId: string; participantId: string | null }
) & {
  triggerLabel?: string;
};

function getClipUsedCount(purchase: OrderPurchaseForAdmin) {
  return purchase.PurchaseItems.reduce(
    (sum, item) => sum + item.bookings.length,
    0,
  );
}

function getClipTotalCount(purchase: OrderPurchaseForAdmin) {
  return getClipUsedCount(purchase) + (purchase.remainingCount ?? 0);
}

function getItemTotalCount(
  item: OrderPurchaseForAdmin["PurchaseItems"][number],
) {
  return item.bookings.length + item.remainingCount;
}

export function ProductEditorDialog(props: ProductEditorDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [purchases, setPurchases] = useState<OrderPurchaseForAdmin[] | null>(
    null,
  );
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countValues, setCountValues] = useState<Record<string, string>>({});
  const [courseDrafts, setCourseDrafts] = useState<Record<string, string>>({});
  const [showAllCourses, setShowAllCourses] = useState<Record<string, boolean>>(
    {},
  );

  const orderId = props.scope === "order" ? props.orderId : undefined;
  const userId = props.scope === "student" ? props.userId : undefined;
  const participantId =
    props.scope === "student" ? props.participantId : undefined;

  const loadPurchases = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const fetchPurchases =
      orderId !== undefined
        ? getPurchaseFromOrder(orderId)
        : getPurchasesForStudent({
            userId: userId as string,
            participantId: participantId ?? null,
          });

    Promise.all([fetchPurchases, getAllCourses()])
      .then(([purchaseResult, courseResult]) => {
        setPurchases(purchaseResult);
        setAllCourses(courseResult);
      })
      .catch(() => setError("Kunde inte hämta produkter."))
      .finally(() => setIsLoading(false));
  }, [orderId, userId, participantId]);

  useEffect(() => {
    if (!open) return;
    loadPurchases();
  }, [open, loadPurchases]);

  const saveTotal = (input: {
    purchaseId: string;
    purchaseItemId?: string;
    key: string;
    minValue: number;
  }) => {
    const raw = countValues[input.key];
    const nextTotalCount = Number(raw);

    if (!Number.isInteger(nextTotalCount) || nextTotalCount < input.minValue) {
      toast.error(
        `Ange ett heltal som är minst ${input.minValue}. Det som redan använts kan inte underskridas.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await adminUpdatePurchaseRemainingCount({
        purchaseId: input.purchaseId,
        purchaseItemId: input.purchaseItemId,
        nextTotalCount,
      });

      if (!result.success) {
        toast.error("Kunde inte uppdatera saldo", {
          description: result.error,
        });
        return;
      }

      toast.success(result.message);
      loadPurchases();
      router.refresh();
    });
  };

  const swapCourse = (
    purchaseItem: OrderPurchaseForAdmin["PurchaseItems"][number],
    isInProduct: boolean,
  ) => {
    const newCourseId = courseDrafts[purchaseItem.id];
    if (!newCourseId || newCourseId === purchaseItem.courseId) return;

    startTransition(async () => {
      const result = await adminChangePurchaseItemCourse(
        purchaseItem.id,
        newCourseId,
      );

      if (!result.success) {
        toast.error("Kunde inte byta kurs", { description: result.msg });
        return;
      }

      toast.success("Kursen har bytts.", {
        description: isInProduct
          ? undefined
          : "Kursen är inte kopplad till produkten — priset matchar kanske inte längre.",
      });
      loadPurchases();
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
          <EditIcon className="h-3 w-3" />
          {props.triggerLabel ?? "Ändra produkt"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ändra produkter</DialogTitle>
          <DialogDescription>
            Ändra antal klipp/tillfällen manuellt, eller byt vilken kurs en rad
            gäller för. Framtida bokningar på den gamla kursen tas bort och
            klipp återställs automatiskt — historik och redan använda bokningar
            rörs inte.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Hämtar...</div>
        ) : error ? (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Inga produkter hittades.
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const clipUsedCount = getClipUsedCount(purchase);
              const clipTotalCount = getClipTotalCount(purchase);
              const usedCourseIds = new Set(
                purchase.PurchaseItems.map((item) => item.courseId),
              );
              const productCourseIds = new Set(
                purchase.product.courses.map((pc) => pc.courseId),
              );
              const showAll = showAllCourses[purchase.id] ?? false;

              return (
                <div key={purchase.id} className="rounded border p-4">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{purchase.product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Typ: {purchase.type}
                      </div>
                      {purchase.type === "CLIP" ? (
                        <div className="text-sm text-muted-foreground">
                          Använda klipp: {clipUsedCount} • Kvar:{" "}
                          {purchase.remainingCount ?? 0}
                        </div>
                      ) : null}
                    </div>

                    {purchase.type === "CLIP" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={clipUsedCount}
                          className="h-9 w-24 rounded-md border px-3 text-sm"
                          value={
                            countValues[`purchase:${purchase.id}`] ??
                            String(clipTotalCount)
                          }
                          onChange={(event) =>
                            setCountValues((current) => ({
                              ...current,
                              [`purchase:${purchase.id}`]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            saveTotal({
                              purchaseId: purchase.id,
                              key: `purchase:${purchase.id}`,
                              minValue: clipUsedCount,
                            })
                          }
                        >
                          Spara
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {allCourses.length > 1 ? (
                    <label
                      htmlFor={`show-all-courses-${purchase.id}`}
                      className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Checkbox
                        id={`show-all-courses-${purchase.id}`}
                        checked={showAll}
                        onCheckedChange={(checked) =>
                          setShowAllCourses((current) => ({
                            ...current,
                            [purchase.id]: checked === true,
                          }))
                        }
                      />
                      Visa alla kurser (inte bara de kopplade till produkten)
                    </label>
                  ) : null}

                  <div className="space-y-2">
                    {purchase.PurchaseItems.map((item) => {
                      const itemTotalCount = getItemTotalCount(item);
                      const draft = courseDrafts[item.id] ?? item.courseId;
                      const filteredCourses = showAll
                        ? allCourses
                        : allCourses.filter((c) => productCourseIds.has(c.id));
                      const filteredIds = new Set(
                        filteredCourses.map((c) => c.id),
                      );
                      const courseOptions = [
                        ...filteredCourses,
                        ...allCourses.filter(
                          (c) =>
                            !filteredIds.has(c.id) &&
                            (c.id === item.courseId || c.id === draft),
                        ),
                      ];
                      const draftInProduct = productCourseIds.has(draft);

                      return (
                        <div
                          key={item.id}
                          className="space-y-2 rounded border bg-muted/20 p-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1 text-sm">
                              <div className="font-medium">
                                {getCourseName(item.course)}
                              </div>
                              {item.unlimited ? (
                                <div className="text-muted-foreground">
                                  Obegränsad tillgång
                                </div>
                              ) : (
                                <div className="text-muted-foreground">
                                  Använda: {item.bookings.length} • Kvar:{" "}
                                  {item.remainingCount}
                                </div>
                              )}
                            </div>

                            {purchase.type !== "CLIP" && !item.unlimited ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={item.bookings.length}
                                  className="h-9 w-24 rounded-md border px-3 text-sm"
                                  value={
                                    countValues[`item:${item.id}`] ??
                                    String(itemTotalCount)
                                  }
                                  onChange={(event) =>
                                    setCountValues((current) => ({
                                      ...current,
                                      [`item:${item.id}`]: event.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={() =>
                                    saveTotal({
                                      purchaseId: purchase.id,
                                      purchaseItemId: item.id,
                                      key: `item:${item.id}`,
                                      minValue: item.bookings.length,
                                    })
                                  }
                                >
                                  Spara
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          {allCourses.length > 1 ? (
                            <div className="space-y-1 border-t pt-2">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={draft}
                                  onValueChange={(value) =>
                                    setCourseDrafts((current) => ({
                                      ...current,
                                      [item.id]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 flex-1 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {courseOptions.map((course) => (
                                      <SelectItem
                                        key={course.id}
                                        value={course.id}
                                        disabled={
                                          course.id !== item.courseId &&
                                          usedCourseIds.has(course.id)
                                        }
                                      >
                                        {getCourseName(course)}
                                        {productCourseIds.has(course.id)
                                          ? ""
                                          : " (ej i produkt)"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    isPending || draft === item.courseId
                                  }
                                  onClick={() =>
                                    swapCourse(item, draftInProduct)
                                  }
                                >
                                  Byt kurs
                                </Button>
                              </div>
                              {!draftInProduct ? (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  Kursen är inte kopplad till produkten — priset
                                  matchar kanske inte längre.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
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
