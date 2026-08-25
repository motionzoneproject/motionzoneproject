"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toggleCourseActive } from "@/lib/actions/admin";

interface Props {
  courseId: string;
  courseName: string;
  active: boolean;
}

export default function ToggleCourseActiveBtn({
  courseId,
  courseName,
  active,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
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
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
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
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {active
              ? `Avaktivera "${courseName}"?`
              : `Aktivera "${courseName}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {active
              ? "Kursen döljs för kunder och går inte längre att köpa eller boka, tills du aktiverar den igen. Produkter som innehåller kursen påverkas inte automatiskt."
              : "Kursen blir synlig och bokningsbar för kunder igen."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {active ? "Avaktivera" : "Aktivera"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
