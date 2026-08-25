import { requireAdminOrTeacher } from "@/lib/actions/admin";
import { getSessionData } from "@/lib/actions/sessiondata";
import { getTeachers, getTeacherUsers } from "@/lib/actions/teacher-actions";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
import { TeacherList } from "./teacher-list";

interface Props {
  searchParams: Promise<{
    lang?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  await requireAdminOrTeacher();

  const sp = await searchParams;
  const lang = sp.lang === "en" ? "en" : "sv";

  const sessionData = await getSessionData();
  const isTeacher = sessionData?.user.role === "teacher";

  const [allTeachers, allTeacherUsers] = await Promise.all([
    getTeachers(),
    getTeacherUsers(),
  ]);

  // Lärare får bara se/hantera sin egen profil här, inte hela rosterna.
  const teachers = isTeacher
    ? allTeachers.filter((t) => t.id === sessionData?.user.id)
    : allTeachers;
  const teacherUsers = isTeacher
    ? allTeacherUsers.filter((u) => u.id === sessionData?.user.id)
    : allTeacherUsers;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-2xl">Lärarprofiler</span>
          <div className="space-y-0">
            <div className="mt-3 text-sm w-fit">Formulärspråk:</div>
            <div className="w-fit">
              <AdminLanguageSwitch value={lang ?? "sv"} />
            </div>
          </div>
        </div>
      </div>

      <TeacherList
        lang={lang}
        teachersWithProfile={teachers}
        teacherUsers={teacherUsers}
        canDelete={!isTeacher}
        canCreate={!isTeacher || teachers.length === 0}
      />
    </div>
  );
}
