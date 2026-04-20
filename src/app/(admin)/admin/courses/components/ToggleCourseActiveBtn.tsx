"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleCourseActive } from "@/lib/actions/admin-courses";

interface Props {
  courseId: string;
  active: boolean;
}

export default function ToggleCourseActiveBtn({ courseId, active }: Props) {
  const router = useRouter();

  const handleToggle = async () => {
    try {
      const { success, msg } = await toggleCourseActive(courseId, !active);
      if (!success) {
        toast.error(msg);
        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte ändra kursstatus.");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={active ? "Avaktivera (dölj för kunder)" : "Aktivera"}
    >
      {active ? (
        <EyeOffIcon className="h-4 w-4" />
      ) : (
        <EyeIcon className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="sr-only">
        {active ? "Avaktivera kurs" : "Aktivera kurs"}
      </span>
    </Button>
  );
}
