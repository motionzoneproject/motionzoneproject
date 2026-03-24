import { StudiosList } from "@/app/(admin)/admin/omoss/components/StudiosList";
import { StyleList } from "@/app/(admin)/admin/omoss/components/StyleList";
import { TeacherList } from "@/app/(admin)/admin/omoss/components/teacher-list";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getStudios } from "@/lib/actions/studio-actions";
import { getStyles } from "@/lib/actions/style-actions";
import { getTeachers, getTeacherUsers } from "@/lib/actions/teacher-actions";

export default async function Page() {
  const [studios, teachers, teacherUsers, styles] = await Promise.all([
    getStudios(),
    getTeachers(),
    getTeacherUsers(),
    getStyles(),
  ]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Om oss</span>
      </div>

      <Accordion type="single" collapsible defaultValue="studio">
        <AccordionItem value="studio">
          <AccordionTrigger>Studios</AccordionTrigger>
          <AccordionContent>
            <StudiosList studios={studios} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="teachers">
          <AccordionTrigger>Lärarprofiler</AccordionTrigger>
          <AccordionContent>
            <TeacherList
              teachersWithProfile={teachers}
              teacherUsers={teacherUsers}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="styles">
          <AccordionTrigger>Dansstilar</AccordionTrigger>
          <AccordionContent>
            <StyleList styles={styles} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
