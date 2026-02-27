"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "../auth";
import { isAdminRole } from "./admin";

const PAGE_SIZE = 20;

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: Date;
  details: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    dateOfBirth: Date | null;
    bio: string | null;
    allowPhotoVideo: boolean;
  } | null;
};

/**
 * Fetch paginated + filtered list of user accounts.
 * @auth Admin
 */
export async function getUsersForAdmin({
  query = "",
  page = 1,
  pageSize = PAGE_SIZE,
}: {
  query?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  users: AccountUser[];
  total: number;
  totalPages: number;
}> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        details: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            address: true,
            postalCode: true,
            city: true,
            dateOfBirth: true,
            bio: true,
            allowPhotoVideo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Set or remove admin role for a user.
 * @param userId  The ID of the user.
 * @param makeAdmin  true to grant admin, false to demote to user.
 * @auth Admin
 */
export async function setUserAdminRole(
  userId: string,
  makeAdmin: boolean,
): Promise<void> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) throw new Error("Unauthorized");

  await auth.api.setRole({
    body: { userId, role: makeAdmin ? "admin" : "user" },
    headers: await headers(),
  });

  revalidatePath("/admin/accounts");
}
