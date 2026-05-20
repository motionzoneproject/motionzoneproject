"use server";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import { formatDateToInputStr } from "../date-utils";

const SUCCESSFUL_ORDER_STATUSES = ["APPROVED", "PAID"] as const;

type SchemaDateRange = {
  customStartDate: Date | null;
  customEndDate: Date | null;
  termin: {
    startDate: Date;
    endDate: Date;
  };
};

type ParsedDateRange = {
  from: Date;
  to: Date;
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

export type StatsTimelinePoint = {
  date: string;
  income: number;
  orders: number;
  bookings: number;
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
  timeline: StatsTimelinePoint[];
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

function parseCustomDateRange(
  from?: string | null,
  to?: string | null,
): ParsedDateRange | null {
  if (!from || !to) return null;

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  return { from: fromDate, to: toDate };
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
  dateRange?: ParsedDateRange | null,
): Prisma.OrderItemWhereInput {
  return {
    order: {
      status: {
        in: [...SUCCESSFUL_ORDER_STATUSES],
      },
      ...(dateRange && !terminId
        ? {
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          }
        : {}),
    },
    ...(terminId ? { product: buildProductWhere(terminId) } : {}),
  };
}

function buildPotentialReservedOrderItemWhere(
  terminId?: string | null,
  dateRange?: ParsedDateRange | null,
): Prisma.OrderItemWhereInput {
  return {
    order: {
      status: {
        in: ["PENDING_PAYMENT", "PAID", "APPROVED"],
      },
      ...(dateRange && !terminId
        ? {
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          }
        : {}),
    },
    ...(terminId ? { product: buildProductWhere(terminId) } : {}),
  };
}

function buildPurchaseWhere(
  terminId?: string | null,
  dateRange?: ParsedDateRange | null,
): Prisma.PurchaseWhereInput {
  return {
    order: {
      status: {
        not: "CANCELLED",
      },
      ...(dateRange && !terminId
        ? {
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          }
        : {}),
    },
    ...(terminId ? { product: buildProductWhere(terminId) } : {}),
  };
}

function buildBookingWhere(
  terminId?: string | null,
  dateRange?: ParsedDateRange | null,
): Prisma.BookingWhereInput {
  return {
    cancelled: false,
    ...(dateRange
      ? {
          lesson: {
            startTime: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        }
      : {}),
    lesson: {
      cancelled: false,
      ...(terminId ? { terminId } : {}),
    },
  };
}

async function getSelectedPeriod(
  terminId?: string | null,
  customDateRange?: ParsedDateRange | null,
): Promise<StatsPeriod | null> {
  // 1. Hantera custom date range säkert
  if (!terminId && customDateRange) {
    return {
      id: "custom",
      name: "Vald period",
      from: formatDateToInputStr(customDateRange.from), // Säkert format "YYYY-MM-DD"
      to: formatDateToInputStr(customDateRange.to), // Säkert format "YYYY-MM-DD"
    };
  }

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

  // 2. Samla in alla startdatum och formatera dem till "YYYY-MM-DD" strängar
  const startDates = [
    formatDateToInputStr(termin.startDate),
    ...termin.schemaItems
      .map((item) =>
        item.customStartDate
          ? formatDateToInputStr(item.customStartDate)
          : null,
      )
      .filter((v): v is string => v !== null),
  ];

  // 3. Samla in alla slutdatum och formatera dem till "YYYY-MM-DD" strängar
  const endDates = [
    formatDateToInputStr(termin.endDate),
    ...termin.schemaItems
      .map((item) =>
        item.customEndDate ? formatDateToInputStr(item.customEndDate) : null,
      )
      .filter((v): v is string => v !== null),
  ];

  // Eftersom strängar i formatet "YYYY-MM-DD" sorteras perfekt alfabetiskt,
  // kan vi använda vanlig array-sortering för att hitta min/max utan tidszons-skiftningar.
  const fromStr = startDates.sort()[0]; // Sorterar stigande, tar det tidigaste
  const toStr = endDates.sort().reverse()[0]; // Sorterar fallande, tar det senaste

  return {
    id: termin.id,
    name: termin.name,
    from: fromStr, // Ger exakt t.ex. "2026-01-07"
    to: toStr, // Ger exakt t.ex. "2026-06-15"
  };
}

function doesRangeOverlap(
  start: Date | null,
  end: Date | null,
  dateRange: ParsedDateRange,
) {
  if (!start || !end) return false;
  return start <= dateRange.to && end >= dateRange.from;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimelineRange(
  selectedPeriod: StatsPeriod | null,
  orderDates: Date[],
  bookingDates: Date[],
) {
  const allDates = [...orderDates, ...bookingDates];

  // Om det finns faktisk data, använd dess faktiska span
  if (allDates.length > 0) {
    const dataFrom = new Date(Math.min(...allDates.map((d) => d.getTime())));
    dataFrom.setHours(0, 0, 0, 0);

    const dataTo = new Date(Math.max(...allDates.map((d) => d.getTime())));
    dataTo.setHours(0, 0, 0, 0);

    // Om selectedPeriod finns, utvidga spannet så terminens period alltid visas
    if (selectedPeriod) {
      const periodFrom = new Date(selectedPeriod.from);
      periodFrom.setHours(0, 0, 0, 0);

      const periodTo = new Date(selectedPeriod.to);
      periodTo.setHours(0, 0, 0, 0);

      return {
        from: dataFrom < periodFrom ? dataFrom : periodFrom,
        to: dataTo > periodTo ? dataTo : periodTo,
      };
    }

    return { from: dataFrom, to: dataTo };
  }

  // Ingen data alls — visa åtminstone terminens period om den finns
  if (selectedPeriod) {
    const from = new Date(selectedPeriod.from);
    from.setHours(0, 0, 0, 0);

    const to = new Date(selectedPeriod.to);
    to.setHours(0, 0, 0, 0);

    return { from, to };
  }

  return null;
}

function buildDailyTimeline(
  selectedPeriod: StatsPeriod | null,
  orderItems: {
    count: number;
    price: number;
    orderId: string;
    order: { createdAt: Date };
  }[],
  bookings: { lesson: { startTime: Date } }[],
): StatsTimelinePoint[] {
  const range = getTimelineRange(
    selectedPeriod,
    orderItems.map((item) => item.order.createdAt),
    bookings.map((booking) => booking.lesson.startTime),
  );

  if (!range) {
    return [];
  }

  const timelineMap = new Map<
    string,
    StatsTimelinePoint & { orderIds: Set<string> }
  >();

  const cursor = new Date(range.from);

  while (cursor <= range.to) {
    const key = toDateKey(cursor);
    timelineMap.set(key, {
      date: key,
      income: 0,
      orders: 0,
      bookings: 0,
      orderIds: new Set<string>(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const item of orderItems) {
    const key = toDateKey(item.order.createdAt);
    const existing = timelineMap.get(key);
    if (!existing) continue;

    existing.income += item.price * item.count;
    existing.orderIds.add(item.orderId);
  }

  for (const booking of bookings) {
    const key = toDateKey(booking.lesson.startTime);
    const existing = timelineMap.get(key);
    if (!existing) continue;

    existing.bookings += 1;
  }

  return Array.from(timelineMap.values()).map(({ orderIds, ...point }) => ({
    ...point,
    orders: orderIds.size,
  }));
}

export async function getGeneralProductStats(
  terminId?: string | null,
  from?: string | null,
  to?: string | null,
): Promise<ProductStatsItem[]> {
  const customDateRange = parseCustomDateRange(from, to);
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
        where: buildPurchaseWhere(terminId, customDateRange),
        select: {
          productId: true,
        },
      }),
      prisma.orderItem.findMany({
        where: buildOrderItemWhere(terminId, customDateRange),
        select: {
          productId: true,
          count: true,
          price: true,
        },
      }),
      prisma.orderItem.findMany({
        where: buildPotentialReservedOrderItemWhere(terminId, customDateRange),
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

  const result = Array.from(statsMap.values());

  const visibleProducts =
    customDateRange && !terminId
      ? result.filter(
          (product) =>
            product.sold > 0 || product.reserved > 0 || product.income > 0,
        )
      : result;

  return visibleProducts.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.sold !== a.sold) return b.sold - a.sold;
    if (b.income !== a.income) return b.income - a.income;
    return a.name.localeCompare(b.name, "sv");
  });
}

export async function getOrderStats(
  terminId?: string | null,
  from?: string | null,
  to?: string | null,
): Promise<OrderStatsSummary | null> {
  const customDateRange = parseCustomDateRange(from, to);
  const [products, soldOrderItems] = await Promise.all([
    getGeneralProductStats(terminId, from, to),
    prisma.orderItem.findMany({
      where: buildOrderItemWhere(terminId, customDateRange),
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

// När filter ändras, anropas denna.
export async function getTerminsStats(
  terminId?: string | null,
  from?: string | null,
  to?: string | null,
): Promise<TerminStats> {
  const customDateRange = parseCustomDateRange(from, to);
  const selectedPeriod = await getSelectedPeriod(terminId, customDateRange); // Intressant

  const [orderSummary, courses, bookings, timelineOrderItems] =
    await Promise.all([
      getOrderStats(terminId, from, to),

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
        where: buildBookingWhere(terminId, customDateRange),
        orderBy: { lesson: { startTime: "asc" } },
        select: {
          id: true,
          createdAt: true,
          lesson: {
            select: {
              courseId: true,
              startTime: true,
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
      prisma.orderItem.findMany({
        where: buildOrderItemWhere(terminId, customDateRange),
        select: {
          count: true,
          price: true,
          orderId: true,
          order: {
            select: {
              createdAt: true,
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

          periodStart: range.from ? formatDateToInputStr(range.from) : null,
          periodEnd: range.to ? formatDateToInputStr(range.to) : null,
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

  const timeline = buildDailyTimeline(
    selectedPeriod,
    timelineOrderItems,
    bookings,
  );

  const visibleCourseStats =
    customDateRange && !terminId
      ? courseStats.filter(
          (course) =>
            course.bookingCount > 0 ||
            doesRangeOverlap(
              course.periodStart ? new Date(course.periodStart) : null,
              course.periodEnd ? new Date(course.periodEnd) : null,
              customDateRange,
            ),
        )
      : courseStats;

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
      courseCount: visibleCourseStats.length,
    },
    products: orderSummary?.products ?? [],
    courses: visibleCourseStats,
    timeline,
  };
}
