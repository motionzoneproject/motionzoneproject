import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const productsData = [
    {
      name: "Drop-in 1 tillfälle",
      description: "Enstaka tillfälle.",
      price: 199.0,
    },
    {
      name: "Kurs 10 tillfällen",
      description: "Paket om 10 tillfällen.",
      price: 1599.0,
    },
    {
      name: "Klipptkort 5 tillfällen",
      description: "Flexibelt kort för 5 pass.",
      price: 899.0,
    },
  ];

  await prisma.product.createMany({ data: productsData, skipDuplicates: true });

  console.log("Seed complete: products created/ensured.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
