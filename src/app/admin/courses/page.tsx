import { type CourseWithTeacher, getAllCourses } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import CourseItem from "./CourseItem";
import SearchInput from "./components/SearchCourse";
import AddCourseForm from "./forms/AddCourseForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  const allCourses: CourseWithTeacher[] = await getAllCourses(query); // fix: debounce.
  const teachers = await prisma.user.findMany({ where: { role: "admin" } });

  return (
    <div>
      <div className="w-full lg:grid lg:grid-cols-2 gap-2 p-2">
        <div className="col-span-2 flex gap-2">
          <div>
            <span className="font-bold text-2xl">Kurser</span>
          </div>
          <div>
            <SearchInput />
          </div>
          <div>
            <AddCourseForm teachers={teachers} />
          </div>
        </div>

        {allCourses.map((c) => (
          <CourseItem course={c} key={c.id}></CourseItem>
        ))}
      </div>
    </div>
  );
}
