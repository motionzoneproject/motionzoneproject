"use server";

import prisma from "./prisma";

export async function searchCourses(query: string) {
  const courses = await prisma.course.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
  });

  return courses;
}
