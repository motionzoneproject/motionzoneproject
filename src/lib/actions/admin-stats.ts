"use server";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";

const SUCCESSFUL_ORDER_STATUSES = ["APPROVED", "PAID", "COMPLETED"] as const;

type SchemaDateRange = {
  customStartDate: Date | null;
  customEndDate: Date | null;
  termin: {
    startDate: Date;
    endDate: Date;
  };
};

export type StatsPeriod = {
  id: string;
  name: string;
  from: string;
  to: string;
};

export type ProductStatsItem = {
  id: string;
  name: string;
  sold: number;
  reserved: number;
  total: number;
  income: number;
  maxCustomer: number;
  unlimitedCustomers: boolean;
  spotsLeft: number | null;
};

export type CourseStatsItem = {
  id: string;
  name: string;
  teacherName: string;
  linkedProducts: number;
  bookingCount: number;
  studentCount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

export type OrderStatsSummary = {
  orderCount: number;
  totalIncome: number;
  customerCount: number;
  products: ProductStatsItem[];
};

export type TerminStats = {
  selectedPeriod: StatsPeriod | null;
  overview: {
    orderCount: number;
    totalIncome: number;
    customerCount: number;
    soldProducts: number;
    bookingCount: number;
    activeStudents: number;
    courseCount: number;
  };
  products: ProductStatsItem[];
  courses: CourseStatsItem[];
};

function getEffectiveDateRange(items: SchemaDateRange[]) {
  if (items.length === 0) {
    return { from: null, to: null };
  }

  const from = new Date(
    Math.min(
      ...items.map((item) =>
        (item.customStartDate ?? item.termin.startDate).getTime(),
      ),
    ),
  );

  const to = new Date(
    Math.max(
      ...items.map((item) =>
        (item.customEndDate ?? item.termin.endDate).getTime(),
      ),
    ),
  );

  return { from, to };
}

function buildProductWhere(terminId?: string | null): Prisma.ProductWhereInput {
  if (!terminId) return {};

  return {
    courses: {
      some: {
        course: {
          schemaItems: {
            some: {
              terminId,
            },
          },
        },
      },
    },
  };
}

function buildCourseWhere(terminId?: string | null): Prisma.CourseWhereInput {
  if (!terminId) return {};

  return {
    schemaItems: {
      some: {
        terminId,
      },
    },
  };
}

function buildOrderItemWhere(
  terminId?: string | null,
): Prisma.OrderItemWhereInput {
  return {
    order: {
      status: {
        in: [...SUCCESSFUL_ORDER_STATUSES],
      },
    },
    ...(terminId ? { product: buildProductWhere(terminId) } : {}),
  };
}

function buildPotentialReservedOrderItemWhere(
  terminId?: string | null,
): Prisma.OrderItemWhereInput {
  return {
    order: {
      status: {
        in: [
          "CREATED",
          "PENDING_PAYMENT",
          "AWAITING_APPROVAL",
          "PAID",
          "APPROVED",
        ],
      },
    },
    ...(terminId ? { product: buildProductWhere(terminId) } : {}),
  };
}

function buildPurchaseWhere(
  terminId?: string | null,
): Prisma.PurchaseWhereInput {
  return {
    order: {
      status: {
        not: "CANCELLED",
      },
    },
    ...(terminId ? { product: buildProductWhere(terminId) } : {}),
  };
}

function buildBookingWhere(terminId?: string | null): Prisma.BookingWhereInput {
  return {
    cancelled: false,
    lesson: {
      cancelled: false,
      ...(terminId ? { terminId } : {}),
    },
  };
}

async function getSelectedPeriod(
  terminId?: string | null,
): Promise<StatsPeriod | null> {
  if (!terminId) return null;

  const termin = await prisma.termin.findUnique({
    where: { id: terminId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      schemaItems: {
        select: {
          customStartDate: true,
          customEndDate: true,
        },
      },
    },
  });

  if (!termin) return null;

  const from = new Date(
    Math.min(
      termin.startDate.getTime(),
      ...termin.schemaItems
        .map((item) => item.customStartDate?.getTime())
        .filter((value): value is number => value !== undefined),
    ),
  );

  const to = new Date(
    Math.max(
      termin.endDate.getTime(),
      ...termin.schemaItems
        .map((item) => item.customEndDate?.getTime())
        .filter((value): value is number => value !== undefined),
    ),
  );

  return {
    id: termin.id,
    name: termin.name,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export async function getGeneralProductStats(
  terminId?: string | null,
): Promise<ProductStatsItem[]> {
  const [products, soldPurchases, paidOrderItems, potentialReservedOrderItems] =
    await Promise.all([
      prisma.product.findMany({
        where: buildProductWhere(terminId),
        select: {
          id: true,
          name: true,
          maxCustomer: true,
          unlimitedCustomers: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.purchase.findMany({
        where: buildPurchaseWhere(terminId),
        select: {
          productId: true,
        },
      }),
      prisma.orderItem.findMany({
        where: buildOrderItemWhere(terminId),
        select: {
          productId: true,
          count: true,
          price: true,
        },
      }),
      prisma.orderItem.findMany({
        where: buildPotentialReservedOrderItemWhere(terminId),
        select: {
          productId: true,
          count: true,
          order: {
            select: {
              purchases: {
                select: {
                  productId: true,
                },
              },
            },
          },
        },
      }),
    ]);

  const statsMap = new Map<string, ProductStatsItem>(
    products.map((product) => [
      product.id,
      {
        id: product.id,
        name: product.name,
        sold: 0,
        reserved: 0,
        total: 0,
        income: 0,
        maxCustomer: product.maxCustomer,
        unlimitedCustomers: product.unlimitedCustomers,
        spotsLeft: product.unlimitedCustomers ? null : product.maxCustomer,
      },
    ]),
  );

  for (const purchase of soldPurchases) {
    const existing = statsMap.get(purchase.productId);
    if (!existing) continue;

    existing.sold += 1;
  }

  for (const item of paidOrderItems) {
    const existing = statsMap.get(item.productId);
    if (!existing) continue;

    existing.income += item.price * item.count;
  }

  for (const item of potentialReservedOrderItems) {
    const existing = statsMap.get(item.productId);
    if (!existing) continue;

    const purchaseExistsForProduct = item.order.purchases.some(
      (purchase) => purchase.productId === item.productId,
    );

    if (purchaseExistsForProduct) continue;

    existing.reserved += item.count;
  }

  for (const product of statsMap.values()) {
    product.total = product.sold + product.reserved;
    product.spotsLeft = product.unlimitedCustomers
      ? null
      : Math.max(product.maxCustomer - product.total, 0);
  }

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.sold !== a.sold) return b.sold - a.sold;
    if (b.income !== a.income) return b.income - a.income;
    return a.name.localeCompare(b.name, "sv");
  });
}

export async function getOrderStats(
  terminId?: string | null,
): Promise<OrderStatsSummary | null> {
  const [products, soldOrderItems] = await Promise.all([
    getGeneralProductStats(terminId),
    prisma.orderItem.findMany({
      where: buildOrderItemWhere(terminId),
      select: {
        orderId: true,
        order: {
          select: {
            userId: true,
          },
        },
      },
    }),
  ]);

  const orderIds = new Set<string>();
  const customerIds = new Set<string>();

  for (const item of soldOrderItems) {
    orderIds.add(item.orderId);
    customerIds.add(item.order.userId);
  }

  return {
    orderCount: orderIds.size,
    totalIncome: products.reduce((sum, product) => sum + product.income, 0),
    customerCount: customerIds.size,
    products,
  };
}

export async function getTerminsStats(
  terminId?: string | null,
): Promise<TerminStats> {
  const [selectedPeriod, orderSummary, courses, bookings] = await Promise.all([
    getSelectedPeriod(terminId),
    getOrderStats(terminId),
    prisma.course.findMany({
      where: buildCourseWhere(terminId),
      select: {
        id: true,
        name: true,
        minAge: true,
        maxAge: true,
        adult: true,
        level: true,
        teacher: {
          select: {
            name: true,
          },
        },
        products: {
          select: {
            productId: true,
          },
        },
        schemaItems: {
          where: terminId ? { terminId } : undefined,
          select: {
            customStartDate: true,
            customEndDate: true,
            termin: {
              select: {
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.booking.findMany({
      where: buildBookingWhere(terminId),
      select: {
        id: true,
        lesson: {
          select: {
            courseId: true,
          },
        },
        purchaseItem: {
          select: {
            purchase: {
              select: {
                userId: true,
                participantId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const courseMap = new Map<
    string,
    CourseStatsItem & {
      studentKeys: Set<string>;
    }
  >(
    courses.map((course) => {
      const range = getEffectiveDateRange(course.schemaItems);

      return [
        course.id,
        {
          id: course.id,
          name: getCourseName(course).trim(),
          teacherName: course.teacher.name,
          linkedProducts: new Set(
            course.products.map((product) => product.productId),
          ).size,
          bookingCount: 0,
          studentCount: 0,
          periodStart: range.from?.toISOString() ?? null,
          periodEnd: range.to?.toISOString() ?? null,
          studentKeys: new Set<string>(),
        },
      ];
    }),
  );

  const activeStudentKeys = new Set<string>();

  for (const booking of bookings) {
    const course = courseMap.get(booking.lesson.courseId);
    if (!course) continue;

    const purchase = booking.purchaseItem.purchase;
    const studentKey = purchase.participantId
      ? `participant:${purchase.participantId}`
      : `user:${purchase.userId}`;

    course.bookingCount += 1;
    course.studentKeys.add(studentKey);
    activeStudentKeys.add(studentKey);
  }

  const courseStats = Array.from(courseMap.values())
    .map(({ studentKeys, ...course }) => ({
      ...course,
      studentCount: studentKeys.size,
    }))
    .sort((a, b) => {
      if (b.studentCount !== a.studentCount)
        return b.studentCount - a.studentCount;
      if (b.bookingCount !== a.bookingCount)
        return b.bookingCount - a.bookingCount;
      return a.name.localeCompare(b.name, "sv");
    });

  return {
    selectedPeriod,
    overview: {
      orderCount: orderSummary?.orderCount ?? 0,
      totalIncome: orderSummary?.totalIncome ?? 0,
      customerCount: orderSummary?.customerCount ?? 0,
      soldProducts:
        orderSummary?.products.reduce(
          (sum, product) => sum + product.sold,
          0,
        ) ?? 0,
      bookingCount: bookings.length,
      activeStudents: activeStudentKeys.size,
      courseCount: courseStats.length,
    },
    products: orderSummary?.products ?? [],
    courses: courseStats,
  };
}
