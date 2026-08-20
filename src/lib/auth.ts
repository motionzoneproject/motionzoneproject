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
    "https://www.motionzoneworld.com",
  ],
  // Throttle credential and password-reset endpoints so a single IP
  // can't brute-force them. The defaults (100/min) stay for everything
  // else; the customRules below tighten the high-risk paths.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      // better-auth 1.7 renamed this endpoint; "/forget-password" no longer
      // exists, so the old rule silently left it on the 100/min default.
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
      "/change-password": { window: 60, max: 5 },
      "/change-email": { window: 60, max: 5 },
    },
  },
  plugins: [adminPlugin()],
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
  },
});
