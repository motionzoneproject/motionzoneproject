import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

function createPrismaClient() {
  return new PrismaClient({
    adapter,
  });
}

function hasCurrentModelDelegates(client: PrismaClient) {
  return Object.values(Prisma.ModelName).every((modelName) => {
    const delegateName =
      modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return delegateName in client;
  });
}

const prisma =
  globalForPrisma.prisma && hasCurrentModelDelegates(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
