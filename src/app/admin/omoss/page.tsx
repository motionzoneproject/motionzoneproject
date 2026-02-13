import { TeacherList } from "@/components/admin/teacher-list";
import { getTeachers } from "@/lib/actions/teacher-actions";

export default async function Page() {
  const teachers = await getTeachers();

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-6 rounded-lg border">
        <h1 className="text-3xl font-bold mb-2 text-center">Hantera Om Oss</h1>
        <p className="text-muted-foreground">
          Här kan du lägga till, redigera och ta bort lärare som visas på "Om
          oss"-sidan.
        </p>
      </div>

      <TeacherList teachers={teachers} />
    </div>
  );
}
