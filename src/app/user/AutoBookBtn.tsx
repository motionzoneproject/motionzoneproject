"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { autoBookCourseLessons } from "@/lib/actions/server-actions";

interface Props {
  purchaseItemId: string;
  disabled?: boolean;
}

export default function AutoBookBtn({
  purchaseItemId,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled) return;
    setIsLoading(true);
    const res = await autoBookCourseLessons(purchaseItemId);
    if (res.success) {
      toast.success(res.msg);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
    setIsLoading(false);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-foreground"
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      Autoboka kommande
    </Button>
  );
}
