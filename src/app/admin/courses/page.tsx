import { getAllCourses } from "@/lib/actions/admin";
import CourseItem from "./CourseItem";

export default async function Page() {
  const allCourses = await getAllCourses();

  return (
    <div>
      <div className="w-full md:grid md:grid-cols-2 gap-2 p-2">
        <div className="col-span-2 flex gap-2">
          <div>
            <span className="font-bold text-2xl">Kurser</span>
          </div>
          <div>(lägg till kurs-knapp)</div>
          <br />
        </div>
        {allCourses.map((c) => (
          <CourseItem course={c} key={c.id}></CourseItem>
        ))}
      </div>
    </div>
  );
}
