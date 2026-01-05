import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin } from "better-auth/plugins";
import prisma from "@/lib/prisma"; // Importera din HMR-säkra, adapter-konfigurerade instans

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    "http://localhost:3000",
    "https://dev.motionzoneworld.com",
    "https://motionzoneworld.com",
  ],
  plugins: [adminPlugin()],
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
  },
});
