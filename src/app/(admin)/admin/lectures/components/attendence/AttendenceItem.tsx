"use client";

import { Trash2, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type {
  Booking,
  Participant,
  Product,
  PurchaseItem,
  User,
} from "@/generated/prisma/client";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { removeUserFromLesson } from "@/lib/actions/admin";

const attendanceLabel = {
  PRESENT: { text: "Närvarande", className: "text-emerald-600" },
  ABSENT: { text: "Frånvarande", className: "text-amber-600" },
  none: { text: "Ingen närvaro", className: "text-amber-600" },
};

export function AttendeceItem({
  booking,
  user,
  participant,
  purchaseItem,
  product,
  attendance,
  onChanged,
}: {
  booking: Booking;
  participant: Participant | null;
  user: User;
  purchaseItem: PurchaseItem;
  product: Product;
  /** Elevens närvaro på lektionen. Undefined när närvaron inte är tagen. */
  attendance?: AttendanceStatus | null;
  /** Körs när bokningen tagits bort. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);

  // Gav tidigare ingen återkoppling alls: bokningen försvann först när
  // sidan laddades om.
  const remove = async () => {
    setIsRemoving(true);
    try {
      const res = await removeUserFromLesson(purchaseItem.id, booking.lessonId);
      if (res.success) {
        toast.success(res.msg);
        onChanged?.();
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const label =
    attendance === undefined ? null : attendanceLabel[attendance ?? "none"];

  const ownerName = user.name;
  const partName = participant?.name ?? ownerName;
  const displayName =
    partName === ownerName ? ownerName : `${partName} (kund: ${ownerName})`;

  return (
    <Item>
      <ItemMedia variant="icon">
        <UserIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{displayName}</ItemTitle>
        <ItemDescription>
          Produkt: {product.name}
          {label && (
            <>
              {" · "}
              <span className={`font-medium ${label.className}`}>
                {label.text}
              </span>
            </>
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={booking.cancelled || isRemoving}
          type="button"
          onClick={remove}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Ta bort från lektion</span>
        </Button>
      </ItemActions>
    </Item>
  );
}
