import { getSessionData } from "./actions/sessiondata";
import prisma from "./prisma";

/**
 * Får den inloggade ändra i en kurs: boka in och ut elever, eller ändra vem
 * som går kursen? Admin får alltid, en lärare (med lärarrollen) bara i sina
 * egna kurser.
 */
export async function mayManageCourse(courseId: string): Promise<boolean> {
  const session = await getSessionData();
  if (!session) return false;
  if (session.user.role === "admin") return true;
  // teacherId ligger kvar på kursen även om rollen tas ifrån någon. Utan
  // rollkontrollen skulle en före detta lärare fortfarande kunna boka ut
  // elever och läsa kundernas namn och mejl.
  if (session.user.role !== "teacher") return false;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });

  return course?.teacherId === session.user.id;
}
