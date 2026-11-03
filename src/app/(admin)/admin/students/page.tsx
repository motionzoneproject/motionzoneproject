import { PaginationBar } from "@/components/PaginationBar";
import type { ProductType } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/actions/admin";
import { collectRosters } from "@/lib/course-roster-data";
import { formatDateToInputStr } from "@/lib/date-utils";
import type { OrderStatus } from "@/lib/order-status";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
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
    allowPhotoVideo: boolean;
    dateOfBirth: Date | null;
  } | null;
};

type StudentParticipantSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  allowPhotoVideo: boolean;
  dateOfBirth: Date | null;
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
  startTime: Date;
  endTime: Date;
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

type StudentPendingOrderItemSummary = {
  id: string;
  orderId: string;
  status: OrderStatus;
  isPaid: boolean;
  product: {
    id: string;
    name: string;
  };
  courses: { id: string; name: string }[];
};

export type StudentSummary = {
  studentKey: string;
  userId: string;
  participantId: string | null;
  name: string;
  customerName: string | null;
  dateOfBirth: Date | null;
  user: StudentUserSummary;
  participant: StudentParticipantSummary | null;
  courses: { id: string; name: string }[];
  terminer: { id: string; name: string }[];
  bookings: StudentBookingSummary[];
  purchases: StudentPurchaseSummary[];
  pendingOrderItems: StudentPendingOrderItemSummary[];
  hasApprovedPurchase: boolean;
  hasPendingOrder: boolean;
  /** Sant när eleven lagts till i den filtrerade kursen för hand, utan köp. */
  addedManually?: boolean;
};

/**
 * Fälten kursens fullständiga namn byggs av. "Balett" och "Jazzdans" finns i
 * flera åldrar och nivåer, så kursnamnet ensamt går inte att skilja på.
 */
const courseNameFields = {
  name: true,
  minAge: true,
  maxAge: true,
  adult: true,
  level: true,
} as const;

const purchaseSelect = {
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
          allowPhotoVideo: true,
          dateOfBirth: true,
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
      userId: true,
      allowPhotoVideo: true,
      dateOfBirth: true,
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
      autobook: true,
    },
  },
  PurchaseItems: {
    select: {
      id: true,
      courseId: true,
      remainingCount: true,
      unlimited: true,
      orderItem: {
        select: {
          courseSelections: {
            select: {
              courseId: true,
            },
          },
        },
      },
      course: {
        select: {
          id: true,
          ...courseNameFields,
          teacherId: true,
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
} satisfies Prisma.PurchaseSelect;

type StudentPurchaseRow = Prisma.PurchaseGetPayload<{
  select: typeof purchaseSelect;
}>;

const pendingOrderItemSelect = {
  id: true,
  orderId: true,
  participantId: true,
  order: {
    select: {
      id: true,
      userId: true,
      status: true,
      isPaid: true,
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
              allowPhotoVideo: true,
              dateOfBirth: true,
            },
          },
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
      userId: true,
      allowPhotoVideo: true,
      dateOfBirth: true,
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
      autobook: true,
      courses: {
        select: {
          course: {
            select: {
              id: true,
              ...courseNameFields,
              teacherId: true,
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
        },
      },
    },
  },
  courseSelections: {
    select: {
      course: {
        select: {
          id: true,
          ...courseNameFields,
          teacherId: true,
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
    },
  },
} satisfies Prisma.OrderItemSelect;

type StudentPendingOrderItemRow = Prisma.OrderItemGetPayload<{
  select: typeof pendingOrderItemSelect;
}>;

/** Kurserna en obeviljad orderrad gäller: kundens kursval, annars produktens. */
function orderedCourses(item: StudentPendingOrderItemRow) {
  const selected = item.courseSelections.map((selection) => selection.course);
  return selected.length > 0
    ? selected
    : item.product.courses.map((link) => link.course);
}

function buildStudentSummaries(
  purchasesWithData: StudentPurchaseRow[],
  pendingOrderItems: StudentPendingOrderItemRow[],
  approvedStudentKeys?: Set<string>,
): StudentSummary[] {
  const studentMap = new Map<
    string,
    StudentSummary & {
      terminMap: Map<string, { id: string; name: string }>;
      bookingMap: Map<string, StudentBookingSummary>;
    }
  >();

  for (const purchase of purchasesWithData) {
    const participant = purchase.participantId ? purchase.participant : null;

    const studentKey = participant
      ? `participant:${participant.id}`
      : `user:${purchase.userId}`;

    const existing = studentMap.get(studentKey) ?? {
      studentKey,
      userId: purchase.user.id,
      participantId: participant?.id ?? null,
      name: participant?.name ?? purchase.user.name,
      customerName: participant ? participant.addedBy.name : null,
      dateOfBirth: participant
        ? participant.dateOfBirth
        : (purchase.user.details?.dateOfBirth ?? null),
      user: {
        id: purchase.user.id,
        name: purchase.user.name,
        email: purchase.user.email,
        details: purchase.user.details,
      },
      participant: participant
        ? {
            id: participant.id,
            name: participant.name,
            email: participant.email,
            phone: participant.phone,
            allowPhotoVideo: participant.allowPhotoVideo,
            dateOfBirth: participant.dateOfBirth,
            addedBy: participant.addedBy,
          }
        : null,
      // Fylls i av applyRosters, så att kurserna kommer ur samma lista som
      // kursdialogen och närvaron.
      courses: [],
      terminer: [],
      bookings: [],
      purchases: [],
      pendingOrderItems: [],
      hasApprovedPurchase: true,
      hasPendingOrder: false,
      terminMap: new Map<string, { id: string; name: string }>(),
      bookingMap: new Map<string, StudentBookingSummary>(),
    };
    existing.hasApprovedPurchase = true;

    const purchaseItems: StudentPurchaseItemSummary[] =
      purchase.PurchaseItems.filter((item) => {
        const selections = item.orderItem?.courseSelections ?? [];
        // Om det finns explicit valda kurser (paketval), visa bara de som matchar item.courseId
        if (selections.length > 0) {
          return selections.some((sel) => sel.courseId === item.courseId);
        }
        // Annars är det en vanlig produkt/kurs där alla PurchaseItems gäller
        return true;
      }).map((item) => {
        for (const schemaItem of item.course.schemaItems) {
          existing.terminMap.set(schemaItem.termin.id, schemaItem.termin);
        }

        for (const booking of item.bookings) {
          existing.bookingMap.set(booking.id, {
            id: booking.id,
            lessonId: booking.lessonId,
            purchaseItemId: item.id,
            courseName: getCourseName(item.course),
            startTime: booking.lesson.startTime,
            endTime: booking.lesson.endTime,
          });
        }

        return {
          id: item.id,
          courseId: item.course.id,
          courseName: getCourseName(item.course),
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

  for (const item of pendingOrderItems) {
    const participant = item.participantId ? item.participant : null;
    const user = item.order.user;

    const studentKey = participant
      ? `participant:${participant.id}`
      : `user:${item.order.userId}`;

    const existing = studentMap.get(studentKey) ?? {
      studentKey,
      userId: user.id,
      participantId: participant?.id ?? null,
      name: participant?.name ?? user.name,
      customerName: participant ? participant.addedBy.name : null,
      dateOfBirth: participant
        ? participant.dateOfBirth
        : (user.details?.dateOfBirth ?? null),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        details: user.details,
      },
      participant: participant
        ? {
            id: participant.id,
            name: participant.name,
            email: participant.email,
            phone: participant.phone,
            allowPhotoVideo: participant.allowPhotoVideo,
            dateOfBirth: participant.dateOfBirth,
            addedBy: participant.addedBy,
          }
        : null,
      // Fylls i av applyRosters, så att kurserna kommer ur samma lista som
      // kursdialogen och närvaron.
      courses: [],
      terminer: [],
      bookings: [],
      purchases: [],
      pendingOrderItems: [],
      hasApprovedPurchase: approvedStudentKeys?.has(studentKey) ?? false,
      hasPendingOrder: true,
      terminMap: new Map<string, { id: string; name: string }>(),
      bookingMap: new Map<string, StudentBookingSummary>(),
    };
    existing.hasPendingOrder = true;

    const courses = orderedCourses(item);

    for (const course of courses) {
      for (const schemaItem of course.schemaItems) {
        existing.terminMap.set(schemaItem.termin.id, schemaItem.termin);
      }
    }

    existing.pendingOrderItems.push({
      id: item.id,
      orderId: item.orderId,
      status: item.order.status,
      isPaid: item.order.isPaid,
      product: item.product,
      courses: courses
        .map((course) => ({ id: course.id, name: getCourseName(course) }))
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
    });

    studentMap.set(studentKey, existing);
  }

  return Array.from(studentMap.values())
    .map(({ bookingMap, terminMap, ...student }) => ({
      ...student,
      terminer: Array.from(terminMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "sv"),
      ),
      bookings: Array.from(bookingMap.values()).sort((a, b) =>
        formatDateToInputStr(a.startTime).localeCompare(
          formatDateToInputStr(b.startTime),
        ),
      ),
      purchases: student.purchases.sort((a, b) =>
        a.product.name.localeCompare(b.product.name, "sv"),
      ),
      pendingOrderItems: student.pendingOrderItems.sort((a, b) =>
        a.product.name.localeCompare(b.product.name, "sv"),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

const detailsSelect = {
  firstName: true,
  lastName: true,
  phoneNumber: true,
  address: true,
  postalCode: true,
  city: true,
  allowPhotoVideo: true,
  dateOfBirth: true,
} satisfies Prisma.UserDetailsSelect;

/**
 * Sätter elevernas kurser och kurs- och lärarfiltret efter deltagarlistan, den
 * som kursdialogen och närvaron också utgår från (collectRosters). Då följer
 * allt samma regel: ett terminskort räknas bara där eleven är inbokad, en
 * borttagning vinner alltid, och ett manuellt tillägg lägger till kursen.
 *
 * Databasfiltret ovan tar med alla som har tillgång till kursen; det är här
 * listan görs rätt. Elever som bara finns som tillägg — utan köp — läggs till
 * i listan när man filtrerar på kursen eller läraren. Övriga filter gäller
 * tilläggen också: terminen avgörs av kursen, och en elev utan köp har ingen
 * order som väntar på godkännande.
 */
async function applyRosters(
  students: StudentSummary[],
  allCourses: (Parameters<typeof getCourseName>[0] & {
    id: string;
    teacherId: string;
  })[],
  filters: {
    course: string;
    teacher: string;
    product: string;
    termin: string;
    approval: "all" | "approved" | "unapproved";
    query: string;
  },
): Promise<StudentSummary[]> {
  const rosters = await collectRosters(allCourses.map((c) => c.id));

  const coursesByStudent = new Map<string, { id: string; name: string }[]>();
  for (const course of allCourses) {
    for (const studentKey of rosters.get(course.id)?.keys() ?? []) {
      const list = coursesByStudent.get(studentKey) ?? [];
      list.push({ id: course.id, name: getCourseName(course) });
      coursesByStudent.set(studentKey, list);
    }
  }
  const coursesOf = (studentKey: string) =>
    [...(coursesByStudent.get(studentKey) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "sv"),
    );

  for (const student of students) {
    student.courses = coursesOf(student.studentKey);
  }

  if (!filters.course && !filters.teacher) return students;

  const teacherCourseIds = new Set(
    allCourses.filter((c) => c.teacherId === filters.teacher).map((c) => c.id),
  );
  const inScope = (courseId: string) =>
    (!filters.course || courseId === filters.course) &&
    (!filters.teacher || teacherCourseIds.has(courseId));

  const result = students.filter((s) => s.courses.some((c) => inScope(c.id)));

  // Produktfiltret gäller köp, och en manuellt tillagd elev har inget. Hen
  // har inte heller någon order som väntar på godkännande.
  if (filters.product || filters.approval === "unapproved") return result;

  const terminCourseIds = filters.termin
    ? new Set(
        (
          await prisma.course.findMany({
            where: { schemaItems: { some: { terminId: filters.termin } } },
            select: { id: true },
          })
        ).map((c) => c.id),
      )
    : null;

  const listed = new Set(result.map((s) => s.studentKey));
  const missingKeys = new Set<string>();
  for (const course of allCourses) {
    if (!inScope(course.id)) continue;
    if (terminCourseIds && !terminCourseIds.has(course.id)) continue;
    for (const student of rosters.get(course.id)?.values() ?? []) {
      if (student.addedManually && !listed.has(student.studentKey))
        missingKeys.add(student.studentKey);
    }
  }
  if (missingKeys.size === 0) return result;

  const missing = [...missingKeys].map((key) => key.split(":"));
  const participantIds = missing
    .filter(([kind]) => kind === "participant")
    .map(([, id]) => id);
  const userIds = missing
    .filter(([kind]) => kind === "user")
    .map(([, id]) => id);

  const [participants, users] = await Promise.all([
    prisma.participant.findMany({
      where: { id: { in: participantIds } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        allowPhotoVideo: true,
        dateOfBirth: true,
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            details: { select: detailsSelect },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        details: { select: detailsSelect },
      },
    }),
  ]);

  const empty = {
    terminer: [],
    bookings: [],
    purchases: [],
    pendingOrderItems: [],
    hasApprovedPurchase: false,
    hasPendingOrder: false,
    addedManually: true,
  };

  const extra: StudentSummary[] = [
    ...participants.map((p) => ({
      ...empty,
      studentKey: `participant:${p.id}`,
      userId: p.addedBy.id,
      participantId: p.id,
      name: p.name,
      customerName: p.addedBy.name,
      dateOfBirth: p.dateOfBirth,
      user: {
        id: p.addedBy.id,
        name: p.addedBy.name,
        email: p.addedBy.email,
        details: p.addedBy.details,
      },
      participant: {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        allowPhotoVideo: p.allowPhotoVideo,
        dateOfBirth: p.dateOfBirth,
        addedBy: {
          id: p.addedBy.id,
          name: p.addedBy.name,
          email: p.addedBy.email,
        },
      },
      courses: coursesOf(`participant:${p.id}`),
    })),
    ...users.map((u) => ({
      ...empty,
      studentKey: `user:${u.id}`,
      userId: u.id,
      participantId: null,
      name: u.name,
      customerName: null,
      dateOfBirth: u.details?.dateOfBirth ?? null,
      user: { id: u.id, name: u.name, email: u.email, details: u.details },
      participant: null,
      courses: coursesOf(`user:${u.id}`),
    })),
  ];

  // Samma fält som sökningen bland köpen: elevens och kundens namn, e-post
  // och kursnamnet. Produkten finns inte för ett tillägg.
  const q = filters.query.trim().toLowerCase();
  const matchingExtra = q
    ? extra.filter((s) =>
        [
          s.name,
          s.user.name,
          s.user.email,
          s.participant?.email,
          ...s.courses.map((c) => c.name),
        ].some((field) => field?.toLowerCase().includes(q)),
      )
    : extra;

  return [...result, ...matchingExtra].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
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
    approval?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query = params.q || "";
  const teacher = params.teacher || "";
  const termin = params.termin || "";
  const course = params.course || "";
  const product = params.product || "";
  const approval =
    params.approval === "approved" || params.approval === "unapproved"
      ? params.approval
      : "all";

  const teachers = await prisma.user.findMany({
    where: { role: { in: ["admin", "teacher"] } },
    orderBy: { name: "asc" },
  });

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });

  const courses = await prisma.course.findMany({ orderBy: { name: "asc" } });

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  const purchaseFilters: Prisma.PurchaseWhereInput[] = [];
  // "Ej godkänd ännu" är numera bara AWAITING_APPROVAL: CREATED sattes aldrig
  // av koden, och 20260825200000 flyttade alla ordrar ur PENDING_PAYMENT.
  const pendingOrderItemFilters: Prisma.OrderItemWhereInput[] = [
    { order: { status: "AWAITING_APPROVAL" } },
  ];

  if (product) {
    purchaseFilters.push({ productId: product });
    pendingOrderItemFilters.push({ productId: product });
  }

  if (course) {
    purchaseFilters.push({
      PurchaseItems: {
        some: {
          courseId: course,
          OR: [
            //Antingen finns det ett aktivt val i orderItem
            {
              orderItem: {
                courseSelections: {
                  some: { courseId: course },
                },
              },
            },
            // Eller så har produkten inga val överhuvudtaget (vanligt kursköp)
            {
              orderItem: {
                courseSelections: {
                  none: {},
                },
              },
            },
          ],
        },
      },
    });
    pendingOrderItemFilters.push({
      OR: [
        {
          courseSelections: {
            some: { courseId: course },
          },
        },
        {
          product: {
            courses: {
              some: { courseId: course },
            },
          },
        },
      ],
    });
  }

  if (teacher) {
    purchaseFilters.push({
      PurchaseItems: {
        some: {
          course: { teacherId: teacher },
        },
      },
    });
    pendingOrderItemFilters.push({
      OR: [
        {
          courseSelections: {
            some: {
              course: { teacherId: teacher },
            },
          },
        },
        {
          product: {
            courses: {
              some: {
                course: { teacherId: teacher },
              },
            },
          },
        },
      ],
    });
  }

  if (termin) {
    purchaseFilters.push({
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
    pendingOrderItemFilters.push({
      OR: [
        {
          courseSelections: {
            some: {
              course: {
                schemaItems: {
                  some: { terminId: termin },
                },
              },
            },
          },
        },
        {
          product: {
            courses: {
              some: {
                course: {
                  schemaItems: {
                    some: { terminId: termin },
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  if (query) {
    purchaseFilters.push({
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
    pendingOrderItemFilters.push({
      OR: [
        {
          order: {
            user: {
              name: {
                contains: query,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          order: {
            user: {
              email: {
                contains: query,
                mode: Prisma.QueryMode.insensitive,
              },
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
          courseSelections: {
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
        {
          product: {
            courses: {
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
        },
      ],
    });
  }

  const where: Prisma.PurchaseWhereInput =
    purchaseFilters.length > 0 ? { AND: purchaseFilters } : {};
  const pendingOrderItemWhere: Prisma.OrderItemWhereInput = {
    AND: pendingOrderItemFilters,
  };

  const purchasesWithData =
    approval === "unapproved"
      ? []
      : await prisma.purchase.findMany({
          where,
          select: purchaseSelect,
        });

  const pendingOrderItems =
    approval === "approved"
      ? []
      : await prisma.orderItem.findMany({
          where: pendingOrderItemWhere,
          select: pendingOrderItemSelect,
        });

  // Under "unapproved" filtret hoppas hela purchase-queryn över (perf), men
  // vi behöver ändå veta vilka av de synade eleverna redan har ett beviljat
  // köp någon annanstans, annars visas "Ej beviljad än" felaktigt för en
  // befintlig elev som bara lagt till en ny obeviljad order.
  let approvedStudentKeys: Set<string> | undefined;
  if (approval === "unapproved" && pendingOrderItems.length > 0) {
    const participantIds = [
      ...new Set(
        pendingOrderItems
          .map((item) => item.participantId)
          .filter((id): id is string => !!id),
      ),
    ];
    const userIds = [
      ...new Set(pendingOrderItems.map((item) => item.order.userId)),
    ];

    const approvedPurchases = await prisma.purchase.findMany({
      where: {
        OR: [
          ...(participantIds.length > 0
            ? [{ participantId: { in: participantIds } }]
            : []),
          { userId: { in: userIds }, participantId: null },
        ],
      },
      select: { userId: true, participantId: true },
    });

    approvedStudentKeys = new Set(
      approvedPurchases.map((p) =>
        p.participantId ? `participant:${p.participantId}` : `user:${p.userId}`,
      ),
    );
  }

  const builtStudents = buildStudentSummaries(
    purchasesWithData,
    pendingOrderItems,
    approvedStudentKeys,
  );

  const allStudents = await applyRosters(builtStudents, courses, {
    course,
    teacher,
    product,
    termin,
    approval,
    query,
  });

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

      <StudentTableClient
        students={pageStudents}
        course={
          course
            ? (courses
                .filter((c) => c.id === course)
                .map((c) => ({ id: c.id, name: getCourseName(c) }))[0] ?? null)
            : null
        }
      />

      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
