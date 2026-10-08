import { beforeAll, describe, expect, it } from "vitest";
import { delBooking } from "@/lib/actions/server-actions";
import { handleClips } from "@/lib/clips";
import prisma from "@/lib/prisma";
import {
  buy,
  createCourse,
  createProduct,
  createUser,
} from "../helpers/factories";
import { as, futureLessonsOf, insertBooking } from "../helpers/orders";

type User = Awaited<ReturnType<typeof createUser>>;

let admin: User;
let teacher: User;

beforeAll(async () => {
  admin = await createUser({ role: "admin" });
  teacher = await createUser({ role: "teacher" });
});

async function clipCard(totalCount: number, courseCount = 2) {
  const courses = [];
  for (let i = 0; i < courseCount; i++) {
    courses.push(await createCourse({ teacher, future: 4 }));
  }
  const product = await createProduct({
    type: "CLIP",
    courses,
    totalCount,
    autobook: true,
  });
  const buyer = await createUser();
  const bought = await buy({ admin, buyer, product });
  return { ...bought, courses, buyer, product };
}

async function pot(purchaseId: string) {
  const p = await prisma.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
  });
  return p.remainingCount;
}

const adjust = (purchaseItemId: string, n: number) =>
  prisma.$transaction((tx) => handleClips(tx, purchaseItemId, n));

describe("klippkort", () => {
  it("potten ligger på köpet, raderna har inget eget saldo och inget autobokas", async () => {
    const { purchase, items } = await clipCard(5);
    expect(purchase.type).toBe("CLIP");
    expect(purchase.totalCount).toBe(5);
    expect(purchase.remainingCount).toBe(5);
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.remainingCount).toBe(0);
      expect(item.lessonsIncluded).toBe(0);
      expect(
        await prisma.booking.count({ where: { purchaseItemId: item.id } }),
      ).toBe(0);
    }
  });

  it("alla kurser drar från samma pott", async () => {
    const { purchase, items } = await clipCard(5);
    expect(await adjust(items[0].id, -2)).toEqual({ success: true });
    expect(await adjust(items[1].id, -1)).toEqual({ success: true });
    expect(await pot(purchase.id)).toBe(2);
    // Raderna själva rörs inte.
    const rows = await prisma.purchaseItem.findMany({
      where: { purchaseId: purchase.id },
    });
    expect(rows.every((r) => r.remainingCount === 0)).toBe(true);
    expect(await adjust(items[1].id, 1)).toEqual({ success: true });
    expect(await pot(purchase.id)).toBe(3);
  });

  it("saldot blir aldrig negativt", async () => {
    const { purchase, items } = await clipCard(2);
    expect(await adjust(items[0].id, -3)).toEqual({
      success: false,
      msg: "Insufficient remaining clips.",
    });
    expect(await pot(purchase.id)).toBe(2);
    expect((await adjust(items[0].id, -2)).success).toBe(true);
    expect((await adjust(items[1].id, -1)).success).toBe(false);
    expect(await pot(purchase.id)).toBe(0);
  });

  it("samtidiga avdrag tar aldrig mer än potten", async () => {
    const { purchase, items } = await clipCard(3);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => adjust(items[i % 2].id, -1)),
    );
    expect(results.filter((r) => r.success)).toHaveLength(3);
    expect(await pot(purchase.id)).toBe(0);
  });

  it("noll är en no-op och okänd rad ger fel", async () => {
    const { purchase, items } = await clipCard(3);
    expect((await adjust(items[0].id, 0)).success).toBe(true);
    expect(await pot(purchase.id)).toBe(3);
    expect(await adjust("finns-inte", -1)).toEqual({
      success: false,
      msg: "PurchaseItem not found.",
    });
  });

  it("avbokning ger tillbaka klippet till potten", async () => {
    const { purchase, items, courses, buyer } = await clipCard(3);
    const [lesson] = await futureLessonsOf(courses[0].id);
    await insertBooking({
      lessonId: lesson.id,
      purchaseItemId: items[0].id,
      userId: buyer.id,
    });
    await adjust(items[0].id, -1);
    expect(await pot(purchase.id)).toBe(2);

    const res = await as(buyer, () => delBooking(lesson.id, items[0].id));
    expect(res.success).toBe(true);
    expect(await pot(purchase.id)).toBe(3);
  });

  it("ett klippkort för en enda kurs med autobokning bokar inte heller automatiskt", async () => {
    const { items } = await clipCard(3, 1);
    expect(
      await prisma.booking.count({ where: { purchaseItemId: items[0].id } }),
    ).toBe(0);
  });
});

describe("kurs- och paketsaldo", () => {
  async function courseItem(lessonsIncluded: number, future = 0) {
    const course = await createCourse({ teacher, future });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded,
      autobook: false,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    return items[0];
  }

  const remaining = async (id: string) =>
    (await prisma.purchaseItem.findUniqueOrThrow({ where: { id } }))
      .remainingCount;

  it("drar från radens eget saldo och aldrig under noll", async () => {
    const item = await courseItem(2);
    expect((await adjust(item.id, -1)).success).toBe(true);
    expect(await adjust(item.id, -2)).toEqual({
      success: false,
      msg: "Insufficient remaining lessons.",
    });
    expect(await remaining(item.id)).toBe(1);
  });

  it("samtidiga avdrag tar aldrig mer än saldot", async () => {
    const item = await courseItem(4);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => adjust(item.id, -1)),
    );
    expect(results.filter((r) => r.success)).toHaveLength(4);
    expect(await remaining(item.id)).toBe(0);
  });

  it("obegränsat köp rörs aldrig", async () => {
    const course = await createCourse({ teacher, future: 0 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 1,
      unlimited: true,
    });
    const { items } = await buy({ admin, buyer: await createUser(), product });
    expect(await adjust(items[0].id, -5)).toEqual({
      success: true,
      msg: "Unlimited purchase; no adjustment made.",
    });
    expect(await remaining(items[0].id)).toBe(1);
  });
});
