import { beforeAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import {
  buy,
  createCourse,
  createProduct,
  createUser,
  futureBookingCount,
} from "../helpers/factories";

describe("testmiljön", () => {
  let admin: Awaited<ReturnType<typeof createUser>>;
  let teacher: Awaited<ReturnType<typeof createUser>>;

  beforeAll(async () => {
    admin = await createUser({ role: "admin" });
    teacher = await createUser({ role: "teacher" });
  });

  it("kör mot en egen, migrerad databas", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    expect(url.pathname).toMatch(/^\/mz_test_/);
    const migrations = await prisma.$queryRaw<{ n: bigint }[]>`
      select count(*) as n from _prisma_migrations where finished_at is not null`;
    expect(Number(migrations[0].n)).toBeGreaterThan(0);
  });

  it("ett godkänt köp av en autobokande kurs bokar alla kommande lektioner", async () => {
    const course = await createCourse({ teacher, past: 2, future: 4 });
    const product = await createProduct({
      type: "COURSE",
      courses: [course],
      lessonsIncluded: 10,
      autobook: true,
    });
    const buyer = await createUser();

    const { items } = await buy({ admin, buyer, product });

    expect(items).toHaveLength(1);
    expect(await futureBookingCount(items[0].id)).toBe(4);
    const item = await prisma.purchaseItem.findUniqueOrThrow({
      where: { id: items[0].id },
    });
    expect(item.remainingCount).toBe(6);
  });
});
