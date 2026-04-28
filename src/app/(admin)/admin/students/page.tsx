import { PaginationBar } from "@/components/PaginationBar";
import type { ProductType } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import StudentsFilter from "./components/StudentsFilter";
import StudentTableClient from "./components/StudentTableClient";

type StudentUserSummary = {
  id: string;
  name: string;
  email: string;
  details: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
  } | null;
};

type StudentParticipantSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  allowPhotoVideo: boolean;
  addedBy: {
    id: string;
    name: string;
    email: string;
  };
};

type StudentBookingSummary = {
  id: string;
  lessonId: string;
  purchaseItemId: string;
  courseName: string;
  startTime: string;
  endTime: string;
};

type StudentPurchaseItemSummary = {
  id: string;
  courseId: string;
  courseName: string;
  remainingCount: number;
  unlimited: boolean;
  bookingsCount: number;
};

type StudentPurchaseSummary = {
  id: string;
  type: ProductType;
  remainingCount: number | null;
  product: {
    id: string;
    name: string;
  };
  purchaseItems: StudentPurchaseItemSummary[];
};

export type StudentSummary = {
  studentKey: string;
  userId: string;
  participantId: string | null;
  name: string;
  customerName: string | null;
  user: StudentUserSummary;
  participant: StudentParticipantSummary | null;
  courses: { id: string; name: string }[];
  terminer: { id: string; name: string }[];
  bookings: StudentBookingSummary[];
  purchases: StudentPurchaseSummary[];
};

type StudentPurchaseRow = Prisma.PurchaseGetPayload<{
  select: {
    id: true;
    type: true;
    remainingCount: true;
    userId: true;
    participantId: true;
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        details: {
          select: {
            firstName: true;
            lastName: true;
            phoneNumber: true;
            address: true;
            postalCode: true;
            city: true;
          };
        };
      };
    };
    participant: {
      select: {
        id: true;
        name: true;
        email: true;
        phone: true;
        allowPhotoVideo: true;
        addedBy: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
    product: {
      select: {
        id: true;
        name: true;
      };
    };
    PurchaseItems: {
      select: {
        id: true;
        remainingCount: true;
        unlimited: true;
        course: {
          select: {
            id: true;
            name: true;
            schemaItems: {
              select: {
                termin: {
                  select: {
                    id: true;
                    name: true;
                  };
                };
              };
            };
          };
        };
        bookings: {
          where: {
            cancelled: false;
          };
          select: {
            id: true;
            lessonId: true;
            lesson: {
              select: {
                startTime: true;
                endTime: true;
              };
            };
          };
        };
      };
    };
  };
}>;

function buildStudentSummaries(
  purchasesWithData: StudentPurchaseRow[],
): StudentSummary[] {
  const studentMap = new Map<
    string,
    StudentSummary & {
      courseMap: Map<string, { id: string; name: string }>;
      terminMap: Map<string, { id: string; name: string }>;
      bookingMap: Map<string, StudentBookingSummary>;
    }
  >();

  for (const purchase of purchasesWithData) {
    const studentKey = purchase.participantId
      ? `participant:${purchase.participantId}`
      : `user:${purchase.userId}`;

    const existing = studentMap.get(studentKey) ?? {
      studentKey,
      userId: purchase.user.id,
      participantId: purchase.participant?.id ?? null,
      name: purchase.participant?.name ?? purchase.user.name,
      customerName: purchase.participant
        ? purchase.participant.addedBy.name
        : null,
      user: {
        id: purchase.user.id,
        name: purchase.user.name,
        email: purchase.user.email,
        details: purchase.user.details,
      },
      participant: purchase.participant
        ? {
            id: purchase.participant.id,
            name: purchase.participant.name,
            email: purchase.participant.email,
            phone: purchase.participant.phone,
            allowPhotoVideo: purchase.participant.allowPhotoVideo,
            addedBy: purchase.participant.addedBy,
          }
        : null,
      courses: [],
      terminer: [],
      bookings: [],
      purchases: [],
      courseMap: new Map<string, { id: string; name: string }>(),
      terminMap: new Map<string, { id: string; name: string }>(),
      bookingMap: new Map<string, StudentBookingSummary>(),
    };

    const purchaseItems: StudentPurchaseItemSummary[] =
      purchase.PurchaseItems.map((item) => {
        existing.courseMap.set(item.course.id, {
          id: item.course.id,
          name: item.course.name,
        });

        for (const schemaItem of item.course.schemaItems) {
          existing.terminMap.set(schemaItem.termin.id, schemaItem.termin);
        }

        for (const booking of item.bookings) {
          existing.bookingMap.set(booking.id, {
            id: booking.id,
            lessonId: booking.lessonId,
            purchaseItemId: item.id,
            courseName: item.course.name,
            startTime: booking.lesson.startTime.toISOString(),
            endTime: booking.lesson.endTime.toISOString(),
          });
        }

        return {
          id: item.id,
          courseId: item.course.id,
          courseName: item.course.name,
          remainingCount: item.remainingCount,
          unlimited: item.unlimited,
          bookingsCount: item.bookings.length,
        };
      });

    existing.purchases.push({
      id: purchase.id,
      type: purchase.type,
      remainingCount: purchase.remainingCount,
      product: purchase.product,
      purchaseItems,
    });

    studentMap.set(studentKey, existing);
  }

  return Array.from(studentMap.values())
    .map(({ bookingMap, courseMap, terminMap, ...student }) => ({
      ...student,
      courses: Array.from(courseMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "sv"),
      ),
      terminer: Array.from(terminMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "sv"),
      ),
      bookings: Array.from(bookingMap.values()).sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      ),
      purchases: student.purchases.sort((a, b) =>
        a.product.name.localeCompare(b.product.name, "sv"),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    teacher?: string;
    termin?: string;
    page?: string;
    course?: string;
    product?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query = params.q || "";
  const teacher = params.teacher || "";
  const termin = params.termin || "";
  const course = params.course || "";
  const product = params.product || "";

  const teachers = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { name: "asc" },
  });

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });

  const courses = await prisma.course.findMany({ orderBy: { name: "asc" } });

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  const filters: Prisma.PurchaseWhereInput[] = [];

  if (product) {
    filters.push({ productId: product });
  }

  if (course) {
    filters.push({
      PurchaseItems: {
        some: { courseId: course },
      },
    });
  }

  if (teacher) {
    filters.push({
      PurchaseItems: {
        some: {
          course: { teacherId: teacher },
        },
      },
    });
  }

  if (termin) {
    filters.push({
      PurchaseItems: {
        some: {
          course: {
            schemaItems: {
              some: { terminId: termin },
            },
          },
        },
      },
    });
  }

  if (query) {
    filters.push({
      OR: [
        {
          user: {
            name: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          user: {
            email: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          participant: {
            name: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          participant: {
            addedBy: {
              name: {
                contains: query,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          product: {
            name: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          PurchaseItems: {
            some: {
              course: {
                name: {
                  contains: query,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        },
      ],
    });
  }

  const where: Prisma.PurchaseWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  const purchasesWithData = await prisma.purchase.findMany({
    where,
    select: {
      id: true,
      type: true,
      remainingCount: true,
      userId: true,
      participantId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          details: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
              address: true,
              postalCode: true,
              city: true,
            },
          },
        },
      },
      participant: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          allowPhotoVideo: true,
          addedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      PurchaseItems: {
        select: {
          id: true,
          remainingCount: true,
          unlimited: true,
          course: {
            select: {
              id: true,
              name: true,
              schemaItems: {
                select: {
                  termin: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          bookings: {
            where: {
              cancelled: false,
            },
            select: {
              id: true,
              lessonId: true,
              lesson: {
                select: {
                  startTime: true,
                  endTime: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const allStudents = buildStudentSummaries(purchasesWithData);

  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(params.page) || 1;
  const totalStudents = allStudents.length;
  const totalPages = Math.ceil(totalStudents / ITEMS_PER_PAGE);
  const pageStudents = allStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Elever</span>
      </div>

      <StudentsFilter
        courses={courses}
        products={products}
        teachers={teachers}
        terminer={terminer}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>Totalt {totalStudents} elever</span>
      </div>

      <StudentTableClient students={pageStudents} />

      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
