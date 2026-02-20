import { notFound } from "next/navigation";
import EditEventForm from "@/app/admin/events/components/EditEventForm";
import prisma from "@/lib/prisma";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) return notFound();

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Edit event</h1>
      <EditEventForm event={event} isOpen={true} />
    </div>
  );
}
