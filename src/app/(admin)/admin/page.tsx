import { HelpCircleIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Prisma } from "@/generated/prisma/client";
import { getSessionData } from "@/lib/actions/sessiondata";
import prisma from "@/lib/prisma";
import { LessonCarousel } from "./components/LessonCarousel";
import { StatsPage } from "./components/StatsPage";

const _lessonsInclude = {
  bookings: true,
  teacher: true,
  course: true,
  schemaItem: true,
} satisfies Prisma.LessonInclude;

export type LessonWithData = Prisma.LessonGetPayload<{
  include: {
    bookings: true;
    course: true;
    teacher: true;
    schemaItem: { include: { studio: true } };
  };
}>;

export default async function Page() {
  const sessionData = await getSessionData();
  const user = sessionData?.user;
  if (!sessionData || !user || user.role !== "admin") {
    return null;
  }

  const now = new Date();

  const lessons: LessonWithData[] = await prisma.lesson.findMany({
    where: {
      teacherId: user.id,
      startTime: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      course: true,
      teacher: true,
      bookings: true,
      schemaItem: { include: { studio: true } },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const futureLessonIndex = lessons.findIndex(
    (l) => new Date(l.endTime) >= now,
  );

  const initialScrollIndex =
    futureLessonIndex === -1 && lessons.length > 0
      ? lessons.length - 1
      : futureLessonIndex === -1
        ? 0
        : futureLessonIndex;

  const ordersWaiting = await prisma.order.count({
    where: { status: { not: "APPROVED" } },
  });

  const ordersUnpaid = await prisma.order.count({ where: { isPaid: false } });

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Översikt</h1>
        <div className="text-center p-3 border-2 border-blue-500 hover:bg-blue-500 rounded-full">
          <Link href="admin-manual.pdf" className="text-sm" target="_blank">
            <HelpCircleIcon className="w-8 h-8 mx-auto" />
            Manual
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {ordersUnpaid > 0 && (
          <div className="flex gap-2 text-xl text-amber-500">
            <div>
              <InfoIcon />
            </div>
            <div>
              <Link href="/admin/orders?paid=UNPAID">
                Det finns <strong>{ordersWaiting} st</strong> obetalda ordrar.
              </Link>
            </div>
          </div>
        )}

        {ordersWaiting > 0 && (
          <div className="flex gap-2 text-xl text-amber-500">
            <div>
              <InfoIcon />
            </div>
            <div>
              <Link href="/admin/orders?status=PENDING">
                Det ligger <strong>{ordersWaiting} st</strong> ordrar som väntar
                på att beviljas.
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-baseline">
          <h2 className="text-xl font-semibold">
            <strong>Dina</strong> senaste och kommande lektioner
          </h2>
        </div>

        <div className="bg-muted/30 p-1 rounded-xl">
          <LessonCarousel
            lessons={lessons}
            initialScrollIndex={initialScrollIndex}
          />
        </div>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-xl">
            Visa statistik
          </AccordionTrigger>
          <AccordionContent>
            <StatsPage />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
