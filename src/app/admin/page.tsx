import { redirect } from "next/navigation";
import { getAdminLessons, isAdminRole } from "@/lib/actions/admin";
import { getSessionData } from "@/lib/actions/sessiondata";
import prisma from "@/lib/prisma";
import AdminLessonCal from "./AdminLessonCal";

export default async function Page() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) {
    redirect("/");
  }

  const session = await getSessionData();
  const currentUserId = session?.user?.id;
  if (!currentUserId) {
    redirect("/");
  }

  const lessons = await getAdminLessons();
  const teachersRaw = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const terms = await prisma.termin.findMany({
    select: { id: true, name: true },
    orderBy: { startDate: "desc" },
  });
  const courses = await prisma.course.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const teachers = [
    ...teachersRaw.filter((t) => t.id === currentUserId),
    ...teachersRaw.filter((t) => t.id !== currentUserId),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Admin - Översikt
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
          Överblick av alla lektioner med snabb åtkomst till närvaro och
          meddelanden.
        </p>
      </div>

      <AdminLessonCal
        lessons={lessons}
        teachers={teachers}
        terms={terms}
        courses={courses}
        currentUserId={currentUserId}
      />
    </div>
  );
}
