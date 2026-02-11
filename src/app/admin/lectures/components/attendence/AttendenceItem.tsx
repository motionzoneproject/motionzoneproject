"use client";

import { DeleteIcon, UserIcon } from "lucide-react";
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
import { removeUserFromLesson } from "@/lib/actions/admin";

export function AttendeceItem({
  booking,
  user,
  participant,
  purchaseItem,
  product,
}: {
  booking: Booking;
  participant: Participant | null;
  user: User;
  purchaseItem: PurchaseItem;
  product: Product;
}) {
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
        <ItemDescription>Produkt: {product.name}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          type="button"
          variant={"destructive"}
          onClick={() =>
            removeUserFromLesson(purchaseItem.id, booking.lessonId)
          }
        >
          <DeleteIcon />
        </Button>
      </ItemActions>
    </Item>
  );
}
