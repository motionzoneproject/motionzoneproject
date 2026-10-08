import { getSessionData } from "./actions/sessiondata";
import prisma from "./prisma";

/**
 * Får den inloggade ändra i en kurs: boka in och ut elever, eller ändra vem
 * som går kursen? Admin får alltid, en lärare bara i sina egna kurser.
 */
export async function mayManageCourse(courseId: string): Promise<boolean> {
  const session = await getSessionData();
  if (!session) return false;
  if (session.user.role === "admin") return true;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });

  return course?.teacherId === session.user.id;
}
