import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TeacherProfile } from "@/generated/prisma/client";
import { getTeachers } from "@/lib/actions/teacher-actions";

const LarareProfile = async () => {
  const teachers: TeacherProfile[] = await getTeachers();

  const activeTeachers = teachers.filter((t) => t.active);

  if (activeTeachers.length === 0) {
    return null; // Or return a message "No teachers found"
  }

  return (
    <section className="py-10 bg-muted/50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold mb-10 mt-10 text-center text-foreground">
          Våra lärare
        </h2>

        <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          {activeTeachers.map((teacher) => (
            <Dialog key={teacher.id}>
              <DialogTrigger>
                <div className="border-2 max-w-full border-border rounded-lg p-6 flex flex-col items-center text-center b hover:bg-accent/50 cursor-pointer transition">
                  <div className="relative h-50 w-50 mb-4 rounded-full overflow-hidden bg-brand/20">
                    {teacher.imageUrl ? (
                      <Image
                        src={teacher.imageUrl}
                        alt={teacher.name}
                        height={150}
                        width={150}
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-500">
                        No Image
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-lg">{teacher.name}</h3>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{teacher.name}</DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    <span className="font-semibold block mb-2">
                      {teacher.specialty}
                    </span>
                    <span className="whitespace-pre-wrap">
                      {teacher.description}
                    </span>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </section>
  );
};
export default LarareProfile;
