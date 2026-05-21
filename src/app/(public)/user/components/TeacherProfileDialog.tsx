"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TeacherForm } from "@/app/(admin)/admin/teachers/teacher-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TeacherWithProfile } from "@/lib/actions/teacher-actions";

type TeacherProfileDialogProps = {
  user: TeacherWithProfile;
};

export function TeacherProfileDialog({ user }: TeacherProfileDialogProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const teacher = user.teacherProfile ? user : undefined;

  const handleSuccess = () => {
    setIsDialogOpen(false);
  };

  if (user.role !== "admin") return null;
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="mx-2">
          <Pencil className="h-4 w-4" />
          {teacher
            ? t("user.teacherProfileDialog.edit")
            : t("user.teacherProfileDialog.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {teacher
              ? t("user.teacherProfileDialog.titleEdit")
              : t("user.teacherProfileDialog.titleCreate")}
          </DialogTitle>
        </DialogHeader>
        <TeacherForm
          teacher={teacher}
          users={[user]}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
