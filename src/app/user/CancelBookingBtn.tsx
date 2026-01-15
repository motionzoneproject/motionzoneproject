"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { delBooking } from "@/lib/actions/server-actions";

interface Props {
  bookingId: string;
  disabled?: boolean;
}

export default function CancelBookingBtn({
  bookingId,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const handleClick = async () => {
    if (isLoading || disabled) return;
    setIsLoading(true);
    const res = await delBooking(bookingId);
    if (res.success) {
      toast.success(res.msg ?? "Bokningen är avbokad.");
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error(res.msg ?? "Kunde inte avboka bokningen.");
    }
    setIsLoading(false);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-destructive hover:text-destructive"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label="Avboka"
      title="Avboka"
    >
      <X className="size-4" />
    </Button>
  );
}
