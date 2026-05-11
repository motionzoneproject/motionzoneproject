import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TeacherWithProfile } from "@/lib/actions/teacher-actions";
import { getTeachers } from "@/lib/actions/teacher-actions";
import { pick } from "@/lib/i18n/pick";
import { getDictionary } from "@/locales/get-dictionary";

const LarareProfile = async () => {
  const { lang, t } = await getDictionary();
  const teachers: TeacherWithProfile[] = await getTeachers();

  const activeTeachers = teachers.filter(
    (teacher) => teacher.teacherProfile?.active,
  );

  if (activeTeachers.length === 0) {
    return null; // Or return a message "No teachers found"
  }

  return (
    <section className="py-10 bg-muted/50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold mb-10 mt-10 text-center text-foreground">
          {t.about.teachersTitle}
        </h2>

        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6">
          {activeTeachers.map((teacher) => {
            const profile = teacher.teacherProfile;
            if (!profile) return null;
            const specialty = pick(profile, "specialty", lang) as string;
            const description = pick(profile, "description", lang) as string;

            return (
              <Dialog key={profile.id}>
                <DialogTrigger>
                  <div className="b flex w-[280px] cursor-pointer flex-col items-center rounded-lg border-2 border-border p-6 text-center transition hover:bg-accent/50">
                    <div className="relative h-50 w-50 mb-4 rounded-full overflow-hidden bg-brand/20">
                      {profile.imageUrl ? (
                        <Image
                          src={profile.imageUrl}
                          alt={profile.name}
                          height={150}
                          width={150}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-500">
                          {t.about.teachersNoImage}
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg">{profile.name}</h3>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-h-[90dvh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>{profile.name}</DialogTitle>
                    <DialogDescription className="text-base mt-2">
                      <span className="font-semibold block mb-2">
                        {specialty}
                      </span>
                      <span className="whitespace-pre-wrap">{description}</span>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </div>
    </section>
  );
};
export default LarareProfile;
