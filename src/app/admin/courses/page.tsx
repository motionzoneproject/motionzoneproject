import { type CourseWithTeacher, getAllCourses } from "@/lib/actions/admin";
import { getCourseName } from "@/lib/tools";
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

  const allCourses: CourseWithTeacher[] = await getAllCourses();
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
            <AddCourseForm />
          </div>
        </div>

        {allCourses
          .filter((c) =>
            getCourseName(c)
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          )
          .sort((a, b) => {
            const nameA = getCourseName(a);
            const nameB = getCourseName(b);

            return nameA.localeCompare(nameB, "sv", { sensitivity: "base" });
          })
          .map((c) => (
            <CourseItem course={c} key={c.id}></CourseItem>
          ))}
      </div>
    </div>
  );
}
