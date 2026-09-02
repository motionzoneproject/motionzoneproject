"use server";

import { headers } from "next/headers";
import type z from "zod";
import type { AdminEditUserSchema } from "@/validations/userforms";
import { auth } from "../auth";
import prisma from "../prisma";
import { formToDbDate } from "../time-convert";
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
    dateOfBirth: Date | null;
    allowPhotoVideo: boolean;
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
            dateOfBirth: true,
            allowPhotoVideo: true,
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
    const dateOfBirth = values.dateOfBirth
      ? formToDbDate(values.dateOfBirth)
      : null;

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
          dateOfBirth,
          allowPhotoVideo: values.allowPhotoVideo,
        },
        create: {
          userId,
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: nullIfEmpty(values.phoneNumber),
          address: nullIfEmpty(values.address),
          postalCode: nullIfEmpty(values.postalCode),
          city: nullIfEmpty(values.city),
          dateOfBirth,
          allowPhotoVideo: values.allowPhotoVideo,
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

export async function adminSetRole(
  userId: string,
  role: "admin" | "teacher" | "user",
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ej behörig." };

  try {
    // better-auth's admin plugin infers setRole's type from its own
    // `adminRoles` config (defaults to "admin" | "user"), so "teacher" trips
    // the type checker even though the endpoint's runtime validation is a
    // plain string. Don't "fix" this by adding "teacher" to adminRoles in
    // auth.ts — that config controls who may call the plugin's *privileged*
    // endpoints (ban, impersonate, set-role-for-others) directly, and would
    // grant teachers that access. The real authorization here is the
    // isAdminRole() check above.
    await auth.api.setRole({
      body: { userId, role: role as "admin" | "user" },
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
