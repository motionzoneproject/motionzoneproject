import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  seedCreateBooking,
  seedCreateOrder,
  seedCreatePurchaseFromOrder,
} from "@/lib/actions/seed-actions";
import { PrismaClient } from "../src/generated/prisma/client";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting order and booking seed...");

  // 1. Get users (elev 2-15)
  const students = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "elev",
      },
    },
    take: 15,
  });

  if (students.length === 0) {
    console.error("No students found. Run newseed.ts first.");
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { email: "admin@motionzoneworld.com" },
  });

  if (!admin) {
    console.error("Admin user not found.");
    return;
  }

  // 2. Get products
  const products = await prisma.product.findMany({
    take: 5,
  });

  if (products.length === 0) {
    console.error("No products found. Run newseed.ts first.");
    return;
  }

  // 3. Create 10 completed (APPROVED) orders
  console.log("Creating 10 approved orders...");
  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length];
    const product = products[i % products.length];

    const order = await seedCreateOrder({
      userId: student.id,
      items: [
        {
          productId: product.id,
          count: 1,
          price: product.price,
        },
      ],
      status: "APPROVED",
    });

    // Create purchase for approved order
    const purchase = await seedCreatePurchaseFromOrder(order.id);
    console.log(
      `Order ${order.id} created and approved for ${student.name}. Purchase ${purchase.id} created.`,
    );

    // 4. Create some bookings for these purchases
    // Get a lesson for the course in the purchase
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: { purchaseId: purchase.id },
      include: { course: { include: { lessons: true } } },
    });

    for (const pi of purchaseItems) {
      // Take the first 2 lessons if available
      const lessons = pi.course.lessons.slice(0, 2);
      for (const lesson of lessons) {
        await seedCreateBooking({
          userId: student.id,
          lessonId: lesson.id,
          purchaseItemId: pi.id,
        });
        console.log(
          `Booking created for ${student.name} on lesson ${lesson.id}`,
        );
      }
    }
  }

  // 5. Create 5 pending (AWAITING_APPROVAL) orders
  console.log("Creating 5 pending orders...");
  for (let i = 0; i < 5; i++) {
    const student = students[(i + 10) % students.length];
    const product = products[(i + 2) % products.length];

    const order = await seedCreateOrder({
      userId: student.id,
      items: [
        {
          productId: product.id,
          count: 1,
          price: product.price,
        },
      ],
      status: "AWAITING_APPROVAL",
    });
    console.log(`Pending order ${order.id} created for ${student.name}.`);
  }

  console.log("✅ Order and booking seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
