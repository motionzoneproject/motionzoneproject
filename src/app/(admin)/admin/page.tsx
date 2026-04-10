import { InfoIcon } from "lucide-react";
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

const lessonsInclude = {
  bookings: true,
  teacher: true,
  course: true,
  schemaItem: true,
} satisfies Prisma.LessonInclude;

export type LessonWithData = Prisma.LessonGetPayload<{
  include: typeof lessonsInclude;
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
      schemaItem: true,
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

  const ordersPaid = await prisma.order.count({
    where: {
      status: "PAID",
    },
  });
  const ordersApp = await prisma.order.count({
    where: {
      status: "PENDING_PAYMENT",
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Översikt admin</h1>
      </div>

      <div className="space-y-4">
        {ordersPaid > 0 && (
          <div className="flex gap-2 text-xl text-green-500">
            <div>
              <InfoIcon />
            </div>
            <div>
              <Link href="/admin/orders?status=PAID">
                Det ligger <strong>{ordersPaid} st</strong> ordrar som behöver
                godkännas.
              </Link>
            </div>
          </div>
        )}

        {ordersApp > 0 && (
          <div className="flex gap-2 text-xl text-green-500">
            <div>
              <InfoIcon />
            </div>
            <div>
              <Link href="/admin/orders?status=PENDING">
                Det ligger <strong>{ordersPaid} st</strong> obetalda ordrar.
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
