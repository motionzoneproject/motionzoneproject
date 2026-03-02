"use server";

import { headers } from "next/headers";
import type z from "zod";
import type { AdminEditUserSchema } from "@/validations/userforms";
import { auth } from "../auth";
import prisma from "../prisma";
import { isAdminRole } from "./admin";

const nullIfEmpty = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  details: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
  } | null;
};

export async function getUsers(
  query: string,
  page: number,
  limit: number,
): Promise<{ users: UserRow[]; total: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { users: [], total: 0 };

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
          {
            details: {
              OR: [
                {
                  firstName: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  lastName: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        ],
      }
    : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        details: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            address: true,
            postalCode: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users: users as UserRow[], total };
}

type AdminEditValues = z.infer<typeof AdminEditUserSchema>;

export async function adminUpdateUserDetails(
  userId: string,
  values: AdminEditValues,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ej behörig." };

  try {
    const fullName = `${values.firstName} ${values.lastName}`.trim();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { name: fullName },
      }),
      prisma.userDetails.upsert({
        where: { userId },
        update: {
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: nullIfEmpty(values.phoneNumber),
          address: nullIfEmpty(values.address),
          postalCode: nullIfEmpty(values.postalCode),
          city: nullIfEmpty(values.city),
        },
        create: {
          userId,
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: nullIfEmpty(values.phoneNumber),
          address: nullIfEmpty(values.address),
          postalCode: nullIfEmpty(values.postalCode),
          city: nullIfEmpty(values.city),
        },
      }),
    ]);

    return { success: true };
  } catch (error: unknown) {
    console.error("adminUpdateUserDetails error:", error);
    const msg =
      error instanceof Error ? error.message : "Kunde inte uppdatera.";
    return { success: false, error: msg };
  }
}

export async function adminSetRole(userId: string, role: "admin" | "user") {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ej behörig." };

  try {
    await auth.api.setRole({
      body: { userId, role },
      headers: await headers(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("adminSetRole error:", error);
    const msg =
      error instanceof Error ? error.message : "Kunde inte ändra roll.";
    return { success: false, error: msg };
  }
}

export async function adminBanUser(
  userId: string,
  reason?: string,
  expiresIn?: number,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ej behörig." };

  try {
    await auth.api.banUser({
      body: {
        userId,
        banReason: reason,
        banExpiresIn: expiresIn,
      },
      headers: await headers(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("adminBanUser error:", error);
    const msg =
      error instanceof Error ? error.message : "Kunde inte blockera användare.";
    return { success: false, error: msg };
  }
}

export async function adminUnbanUser(userId: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ej behörig." };

  try {
    await auth.api.unbanUser({
      body: { userId },
      headers: await headers(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("adminUnbanUser error:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Kunde inte avblockera användare.";
    return { success: false, error: msg };
  }
}
