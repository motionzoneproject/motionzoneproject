import { PaginationBar } from "@/components/PaginationBar";
import type { ProductType } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/actions/admin";
import { placesStudentInCourse } from "@/lib/course-roster";
import { formatDateToInputStr } from "@/lib/date-utils";
import type { OrderStatus } from "@/lib/order-status";
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
          name: true,
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
              name: true,
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
          name: true,
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

/**
 * Kurserna ett köp placerar eleven i, enligt regeln i course-roster. Köpets
 * alla kursrader finns kvar som tillgång under köpet; det här är de kurser
 * eleven räknas in i, och det är dem kursfiltret och kurskolumnen visar.
 */
function placedCourses(purchase: StudentPurchaseRow) {
  const courseCount = purchase.PurchaseItems.length;

  return purchase.PurchaseItems.filter((item) =>
    placesStudentInCourse({
      courseId: item.courseId,
      selectedCourseIds: (item.orderItem?.courseSelections ?? []).map(
        (selection) => selection.courseId,
      ),
      autobook: purchase.product.autobook,
      courseCount,
      activeBookings: item.bookings.length,
    }),
  ).map((item) => item.course);
}

/** Kurserna en obeviljad orderrad gäller: kundens kursval, annars produktens. */
function orderedCourses(item: StudentPendingOrderItemRow) {
  const selected = item.courseSelections.map((selection) => selection.course);
  return selected.length > 0
    ? selected
    : item.product.courses.map((link) => link.course);
}

/**
 * Samma regel för en obeviljad order. Bokningar finns inte än, så ett
 * terminskort eller program placerar ingen förrän schemat satts.
 */
function placedPendingCourses(item: StudentPendingOrderItemRow) {
  const courses = orderedCourses(item);

  return courses.filter((course) =>
    placesStudentInCourse({
      courseId: course.id,
      // Kursvalen är redan tillämpade i orderedCourses.
      selectedCourseIds: [],
      autobook: item.product.autobook,
      courseCount: courses.length,
      activeBookings: 0,
    }),
  );
}

function buildStudentSummaries(
  purchasesWithData: StudentPurchaseRow[],
  pendingOrderItems: StudentPendingOrderItemRow[],
  approvedStudentKeys?: Set<string>,
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
      courses: [],
      terminer: [],
      bookings: [],
      purchases: [],
      pendingOrderItems: [],
      hasApprovedPurchase: true,
      hasPendingOrder: false,
      courseMap: new Map<string, { id: string; name: string }>(),
      terminMap: new Map<string, { id: string; name: string }>(),
      bookingMap: new Map<string, StudentBookingSummary>(),
    };
    existing.hasApprovedPurchase = true;

    const placedCourseIds = new Set(
      placedCourses(purchase).map((course) => course.id),
    );

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
        if (placedCourseIds.has(item.course.id)) {
          existing.courseMap.set(item.course.id, {
            id: item.course.id,
            name: item.course.name,
          });
        }

        for (const schemaItem of item.course.schemaItems) {
          existing.terminMap.set(schemaItem.termin.id, schemaItem.termin);
        }

        for (const booking of item.bookings) {
          existing.bookingMap.set(booking.id, {
            id: booking.id,
            lessonId: booking.lessonId,
            purchaseItemId: item.id,
            courseName: item.course.name,
            startTime: booking.lesson.startTime,
            endTime: booking.lesson.endTime,
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
      courses: [],
      terminer: [],
      bookings: [],
      purchases: [],
      pendingOrderItems: [],
      hasApprovedPurchase: approvedStudentKeys?.has(studentKey) ?? false,
      hasPendingOrder: true,
      courseMap: new Map<string, { id: string; name: string }>(),
      terminMap: new Map<string, { id: string; name: string }>(),
      bookingMap: new Map<string, StudentBookingSummary>(),
    };
    existing.hasPendingOrder = true;

    const courses = orderedCourses(item);

    for (const course of placedPendingCourses(item)) {
      existing.courseMap.set(course.id, { id: course.id, name: course.name });
    }

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
        .map((course) => ({ id: course.id, name: course.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
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
 * Lägger studions manuella ändringar ovanpå listan som härletts ur köp och
 * bokningar. En borttagning vinner alltid: kursen försvinner ur elevens
 * kurskolumn, och eleven ur kurs- och lärarfiltret. Ett manuellt tillägg
 * lägger till kursen, och elever som bara finns som tillägg — utan köp —
 * läggs till i listan när man filtrerar på kursen eller läraren.
 */
async function applyRosterEntries(
  students: StudentSummary[],
  filters: { course: string; teacher: string; product: string; query: string },
): Promise<StudentSummary[]> {
  const entries = await prisma.courseRosterEntry.findMany({
    select: {
      courseId: true,
      studentKey: true,
      status: true,
      course: { select: { id: true, name: true, teacherId: true } },
    },
  });
  if (entries.length === 0 && !filters.course && !filters.teacher)
    return students;

  const removed = new Set(
    entries
      .filter((e) => e.status === "REMOVED")
      .map((e) => `${e.studentKey}|${e.courseId}`),
  );
  const added = entries.filter((e) => e.status === "ADDED");

  const byKey = new Map(students.map((s) => [s.studentKey, s]));

  for (const student of students) {
    student.courses = student.courses.filter(
      (c) => !removed.has(`${student.studentKey}|${c.id}`),
    );
  }

  for (const entry of added) {
    const student = byKey.get(entry.studentKey);
    if (!student || student.courses.some((c) => c.id === entry.courseId))
      continue;
    student.courses = [...student.courses, entry.course].sort((a, b) =>
      a.name.localeCompare(b.name, "sv"),
    );
  }

  if (!filters.course && !filters.teacher) return students;

  const inScope = (courseId: string, teacherId: string) =>
    (!filters.course || courseId === filters.course) &&
    (!filters.teacher || teacherId === filters.teacher);

  const teacherCourseIds = filters.teacher
    ? new Set(
        (
          await prisma.course.findMany({
            where: { teacherId: filters.teacher },
            select: { id: true },
          })
        ).map((c) => c.id),
      )
    : null;

  const result = students.filter((s) =>
    s.courses.some(
      (c) =>
        (!filters.course || c.id === filters.course) &&
        (!teacherCourseIds || teacherCourseIds.has(c.id)),
    ),
  );

  // Produktfiltret gäller köp, och en manuellt tillagd elev har inget.
  if (filters.product) return result;

  const listed = new Set(result.map((s) => s.studentKey));
  const missing = added.filter(
    (e) => inScope(e.courseId, e.course.teacherId) && !listed.has(e.studentKey),
  );
  if (missing.length === 0) return result;

  const participantIds = missing
    .map((e) => e.studentKey.split(":"))
    .filter(([kind]) => kind === "participant")
    .map(([, id]) => id);
  const userIds = missing
    .map((e) => e.studentKey.split(":"))
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

  const coursesFor = (key: string) =>
    missing
      .filter((e) => e.studentKey === key)
      .map((e) => ({ id: e.course.id, name: e.course.name }));

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
      courses: coursesFor(`participant:${p.id}`),
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
      courses: coursesFor(`user:${u.id}`),
    })),
  ];

  const q = filters.query.trim().toLowerCase();
  const matchingExtra = q
    ? extra.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.user.email.toLowerCase().includes(q),
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

  const fetchedPurchases =
    approval === "unapproved"
      ? []
      : await prisma.purchase.findMany({
          where,
          select: purchaseSelect,
        });

  const fetchedPendingOrderItems =
    approval === "approved"
      ? []
      : await prisma.orderItem.findMany({
          where: pendingOrderItemWhere,
          select: pendingOrderItemSelect,
        });

  // Databasfiltret ovan tar med alla som har tillgång till kursen. Kurs- och
  // lärarfiltret ska visa vilka som går den, så här tillämpas regeln i
  // course-roster: ett terminskort räknas bara där eleven är inbokad.
  // Produktfiltret och sökningen lämnas i fred — det är där man hittar en
  // nyköpt elev som ännu inte fått något schema.
  const matchesPlacement = (courses: { id: string; teacherId: string }[]) =>
    (!course || courses.some((c) => c.id === course)) &&
    (!teacher || courses.some((c) => c.teacherId === teacher));

  const filterByPlacement = Boolean(course || teacher);

  const purchasesWithData = filterByPlacement
    ? fetchedPurchases.filter((purchase) =>
        matchesPlacement(placedCourses(purchase)),
      )
    : fetchedPurchases;

  const pendingOrderItems = filterByPlacement
    ? fetchedPendingOrderItems.filter((item) =>
        matchesPlacement(placedPendingCourses(item)),
      )
    : fetchedPendingOrderItems;

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

  const allStudents = await applyRosterEntries(builtStudents, {
    course,
    teacher,
    product,
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
                .map((c) => ({ id: c.id, name: c.name }))[0] ?? null)
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
