"use client";

import { Check, Edit, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteTeacher,
  type TeacherProfileType,
} from "@/lib/actions/teacher-actions"; // Assuming you export TeacherProfileType
import { TeacherForm } from "./teacher-form";

type TeacherListProps = {
  teachers: TeacherProfileType[];
};

export function TeacherList({ teachers }: TeacherListProps) {
  const router = useRouter();
  const [editingTeacher, setEditingTeacher] =
    useState<TeacherProfileType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna lärare?")) return;

    const res = await deleteTeacher(id);
    if (res.success) {
      toast.success(res.msg);
      router.refresh(); // Refresh list
    } else {
      toast.error(res.msg);
    }
  };

  const openEdit = (teacher: TeacherProfileType) => {
    setEditingTeacher(teacher);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingTeacher(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4  p-4">
        <h2 className="text-xl font-bold">Lärarlista</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTeacher(null)}>
              Lägg till lärare
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? "Redigera lärare" : "Lägg till lärare"}
              </DialogTitle>
            </DialogHeader>
            <TeacherForm
              teacher={editingTeacher || undefined}
              onSuccess={handleSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border items-center">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Specialitet</TableHead>
              <TableHead>Aktiv</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center h-24 text-muted-foreground"
                >
                  Inga lärare tillagda än.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.specialty}</TableCell>
                  <TableCell>
                    {teacher.active ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(teacher)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(teacher.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
