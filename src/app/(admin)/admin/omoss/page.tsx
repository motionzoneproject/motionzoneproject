import { StudiosList } from "@/app/(admin)/admin/omoss/components/StudiosList";
import { StyleList } from "@/app/(admin)/admin/omoss/components/StyleList";
import { TeacherList } from "@/app/(admin)/admin/omoss/components/teacher-list";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { requireAdmin } from "@/lib/actions/admin";
import { getStudios } from "@/lib/actions/studio-actions";
import { getStyles } from "@/lib/actions/style-actions";
import { getTeachers, getTeacherUsers } from "@/lib/actions/teacher-actions";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";

interface Props {
  searchParams: Promise<{
    lang?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  await requireAdmin();

  const sp = await searchParams;

  const [studios, teachers, teacherUsers, styles] = await Promise.all([
    getStudios(sp.lang === "en" ? "en" : "sv"),
    getTeachers(),
    getTeacherUsers(),
    getStyles(sp.lang === "en" ? "en" : "sv"),
  ]);

  const lang = sp.lang === "en" ? "en" : "sv";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-2xl">Om oss</span>

          <div className="mt-3 text-sm w-fit">
            Formulärspråk: <AdminLanguageSwitch value={lang ?? "sv"} />
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible defaultValue="studio">
        <AccordionItem value="studio">
          <AccordionTrigger>Studios</AccordionTrigger>
          <AccordionContent>
            <StudiosList lang={lang} studios={studios} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="teachers">
          <AccordionTrigger>Lärarprofiler</AccordionTrigger>
          <AccordionContent>
            <TeacherList
              lang={lang}
              teachersWithProfile={teachers}
              teacherUsers={teacherUsers}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="styles">
          <AccordionTrigger>Dansstilar</AccordionTrigger>
          <AccordionContent>
            <StyleList lang={lang} styles={styles} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
