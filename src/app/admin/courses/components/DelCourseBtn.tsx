"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { delCourse } from "@/lib/actions/admin";

interface Props {
  courseId: string;
}

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

export default function DeleteCourseBtn({ courseId }: Props) {
  const router = useRouter();

  const delItm = async () => {
    try {
      const { success, msg } = await delCourse(courseId);
      if (!success) {
        toast.error(`Failed to delete article: ${msg}`);
        console.log(msg);
        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(
        `Kunde inte ta bort kursen ${courseId}. Anledning: ${JSON.stringify(e)}`,
      );
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Ta bort kurs</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Är du säker?</AlertDialogTitle>
          <AlertDialogDescription>Kan ej ångras.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={async () => await delItm()}>
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
