"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { formatDateToInputStr } from "../date-utils";
import { isAdminRole } from "./admin";

type AdminStudentLinkedUser = {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  bioEn: string | null;
  allowPhotoVideo: boolean | null;
};

type AdminStudentAddedParticipant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth?: string | null;
  allowPhotoVideo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  linkedUser: AdminStudentLinkedUser | null;
};

export type AdminStudentDetails = {
  id: string;
  type: "user" | "participant";
  name: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  bioEn: string | null;
  allowPhotoVideo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  linkedUser: AdminStudentLinkedUser | null;
  addedParticipants: AdminStudentAddedParticipant[];
};

function toIsoString(value: Date | null | undefined) {
  return value ? formatDateToInputStr(value) : null;
}

function mapLinkedUser(
  user: {
    id: string;
    name: string;
    email: string;
    details: {
      firstName: string | null;
      lastName: string | null;
      phoneNumber: string | null;
      address: string | null;
      postalCode: string | null;
      city: string | null;
      dateOfBirth: Date | null;
      bio: string | null;
      bio_en: string | null;
      allowPhotoVideo: boolean;
    } | null;
  } | null,
): AdminStudentLinkedUser | null {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: user.details?.firstName ?? null,
    lastName: user.details?.lastName ?? null,
    phone: user.details?.phoneNumber ?? null,
    address: user.details?.address ?? null,
    postalCode: user.details?.postalCode ?? null,
    city: user.details?.city ?? null,
    dateOfBirth: formatDateToInputStr(user.details?.dateOfBirth),
    bio: user.details?.bio ?? null,
    bioEn: user.details?.bio_en ?? null,
    allowPhotoVideo: user.details?.allowPhotoVideo ?? null,
  };
}

export async function getAdminStudentDetails(input: {
  id: string;
  isParticipant: boolean;
}): Promise<
  | { success: true; details: AdminStudentDetails }
  | { success: false; error: string }
> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ingen behörighet." };

  console.log("Running...");

  try {
    if (input.isParticipant) {
      const participant = await prisma.participant.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          allowPhotoVideo: true,
          createdAt: true,
          updatedAt: true,
          dateOfBirth: true,
          addedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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
                  bio_en: true,
                  allowPhotoVideo: true,
                },
              },
            },
          },
        },
      });

      if (!participant) {
        return { success: false, error: "Deltagaren hittades inte." };
      }

      console.log(
        "Particpant dateOfBirth: " +
          formatDateToInputStr(participant.dateOfBirth),
      );

      return {
        success: true,
        details: {
          id: participant.id,
          type: "participant",
          name: participant.name,
          email: participant.email,
          phone: participant.phone,
          firstName: null,
          lastName: null,
          address: null,
          postalCode: null,
          city: null,
          dateOfBirth: participant.dateOfBirth
            ? formatDateToInputStr(participant.dateOfBirth)
            : null,
          bio: null,
          bioEn: null,
          allowPhotoVideo: participant.allowPhotoVideo,
          createdAt: toIsoString(participant.createdAt),
          updatedAt: toIsoString(participant.updatedAt),
          customer: participant.addedBy,
          linkedUser: mapLinkedUser(participant.user),
          addedParticipants: [],
        },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
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
            bio_en: true,
            allowPhotoVideo: true,
          },
        },
        addedParticipants: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            allowPhotoVideo: true,
            dateOfBirth: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
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
                    bio_en: true,
                    allowPhotoVideo: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Användaren hittades inte." };
    }

    return {
      success: true,
      details: {
        id: user.id,
        type: "user",
        name: user.name,
        email: user.email,
        phone: user.details?.phoneNumber ?? null,
        firstName: user.details?.firstName ?? null,
        lastName: user.details?.lastName ?? null,
        address: user.details?.address ?? null,
        postalCode: user.details?.postalCode ?? null,
        city: user.details?.city ?? null,
        dateOfBirth: toIsoString(user.details?.dateOfBirth),
        bio: user.details?.bio ?? null,
        bioEn: user.details?.bio_en ?? null,
        allowPhotoVideo: user.details?.allowPhotoVideo ?? false,
        createdAt: toIsoString(user.createdAt),
        updatedAt: toIsoString(user.updatedAt),
        customer: null,
        linkedUser: null,
        addedParticipants: user.addedParticipants.map((participant) => ({
          id: participant.id,
          name: participant.name,
          email: participant.email,
          phone: participant.phone,
          allowPhotoVideo: participant.allowPhotoVideo,
          dateOfBirth: toIsoString(participant.dateOfBirth),
          createdAt: toIsoString(participant.createdAt),
          updatedAt: toIsoString(participant.updatedAt),
          linkedUser: mapLinkedUser(participant.user),
        })),
      },
    };
  } catch (error) {
    console.error("getAdminStudentDetails error:", error);
    return { success: false, error: "Kunde inte hämta detaljer." };
  }
}

export async function adminUpdatePurchaseRemainingCount(input: {
  purchaseId: string;
  purchaseItemId?: string;
  nextTotalCount: number;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ingen behörighet." };

  if (!Number.isInteger(input.nextTotalCount) || input.nextTotalCount < 0) {
    return { success: false, error: "Antalet måste vara ett heltal från 0." };
  }

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: input.purchaseId },
      select: {
        id: true,
        type: true,
        remainingCount: true,
        PurchaseItems: {
          select: {
            id: true,
            bookings: {
              where: { cancelled: false },
              select: { id: true },
            },
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!purchase) {
      return { success: false, error: "Purchase hittades inte." };
    }

    if (purchase.type === "CLIP") {
      const usedCount = purchase.PurchaseItems.reduce(
        (sum, item) => sum + item.bookings.length,
        0,
      );

      if (input.nextTotalCount < usedCount) {
        return {
          success: false,
          error: `Totalt antal kan inte vara lägre än använda klipp (${usedCount}).`,
        };
      }

      await prisma.purchase.update({
        where: { id: input.purchaseId },
        data: { remainingCount: input.nextTotalCount - usedCount },
      });
    } else {
      if (!input.purchaseItemId) {
        return { success: false, error: "PurchaseItem saknas." };
      }

      const purchaseItem = await prisma.purchaseItem.findUnique({
        where: { id: input.purchaseItemId },
        select: {
          id: true,
          unlimited: true,
          bookings: {
            where: { cancelled: false },
            select: { id: true },
          },
        },
      });

      if (!purchaseItem) {
        return { success: false, error: "PurchaseItem hittades inte." };
      }

      if (purchaseItem.unlimited) {
        return {
          success: false,
          error: "Obegränsade purchase items kan inte få ett manuellt saldo.",
        };
      }

      const usedCount = purchaseItem.bookings.length;

      if (input.nextTotalCount < usedCount) {
        return {
          success: false,
          error: `Totalt antal kan inte vara lägre än använda bokningar (${usedCount}).`,
        };
      }

      await prisma.purchaseItem.update({
        where: { id: input.purchaseItemId },
        data: { remainingCount: input.nextTotalCount - usedCount },
      });
    }

    revalidatePath("/admin/students");
    revalidatePath("/admin/lectures");
    revalidatePath("/user");

    return {
      success: true,
      message: `Saldot uppdaterades för ${purchase.product.name}.`,
    };
  } catch (error) {
    console.error("adminUpdatePurchaseRemainingCount error:", error);
    return { success: false, error: "Kunde inte uppdatera saldot." };
  }
}
