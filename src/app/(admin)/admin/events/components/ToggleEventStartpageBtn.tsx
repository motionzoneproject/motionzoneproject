"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleEventStartpageVisibility } from "@/lib/actions/admin";

interface Props {
  eventId: string;
  showOnStartpage: boolean;
}

export default function ToggleEventStartpageBtn({
  eventId,
  showOnStartpage,
}: Props) {
  const router = useRouter();

  const handleToggle = async () => {
    try {
      const { success, msg } = await toggleEventStartpageVisibility(
        eventId,
        !showOnStartpage,
      );
      if (!success) {
        toast.error(msg);
        return;
      }

      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte uppdatera startsidans eventvisning.");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={showOnStartpage ? "Dolj pa startsidan" : "Visa pa startsidan"}
    >
      {showOnStartpage ? (
        <EyeIcon className="h-4 w-4" />
      ) : (
        <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="sr-only">
        {showOnStartpage
          ? "Dolj event pa startsidan"
          : "Visa event pa startsidan"}
      </span>
    </Button>
  );
}
