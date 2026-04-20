"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Course, Product } from "@/generated/prisma/client";
import {
  AdminProductCourseItemSchema,
  adminProductSchema,
} from "@/validations/adminforms";
import { sekToOre } from "../money";
import prisma from "../prisma";
import { isAdminRole, type PrismaTx } from "./admin-shared";
import { getProductStats } from "./purchase-actions";

/**
 * Gets all products in db.
 * @auth Admin
 */
export async function getAllProducts(showInactive = false): Promise<Product[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const products = await prisma.product.findMany({
    where: showInactive ? undefined : { active: true },
    orderBy: { name: "asc" },
  });

  return products;
}

/**
 * Represents the relation of prodOnCourse.
 * Also contains the full course.
 */
export type ProdCourse = {
  course: Course;
} & {
  courseId: string;
  productId: string;
  lessonsIncluded: number;
  unlimited: boolean;
};

/**
 * Creates a new product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function addNewProduct(
  formData: z.output<typeof adminProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminProductSchema.parseAsync(formData);
    const unlimitedCustomers = validated.unlimitedCustomers === true;

    const newProd = await prisma.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: sekToOre(validated.price),
        maxCustomer: unlimitedCustomers ? 0 : validated.maxCustomers,
        unlimitedCustomers,
        totalCount: validated.clipCount,
        imageURL: validated.imageURL,
      },
    });

    // Uppdatera typen:
    const type = await updateProductType(newProd.id, {
      isClip: validated.clipcard,
    });
    return {
      success: true,
      msg: `Produkten ${newProd.name} av typen ${type} skapades.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa produkten." };
  }
}

/**
 * Edits a product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function editProduct(
  id: string,
  formData: z.output<typeof adminProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminProductSchema.parseAsync(formData);
    const unlimitedCustomers = validated.unlimitedCustomers === true;
    const maxCustomers = unlimitedCustomers ? 0 : validated.maxCustomers;

    // Kolla så vi inte sänker under redan upptagna platser (sålda + reserverade).
    if (!unlimitedCustomers) {
      const stats = await getProductStats(id);
      if (!stats.success || stats.sold === null || stats.reserved === null) {
        return {
          success: false,
          msg: "Kunde inte verifiera platsstatistik. Försök igen.",
        };
      }

      const usedSpots = stats.sold + stats.reserved;
      if (maxCustomers < usedSpots) {
        return {
          success: false,
          msg: `Kan inte sänka maxantalet under redan upptagna platser (${usedSpots}).`,
        };
      }
    }

    const newProd = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        price: sekToOre(validated.price),
        maxCustomer: maxCustomers,
        unlimitedCustomers,
        totalCount: validated.clipCount,
        imageURL: validated.imageURL,
      },
    });

    // Uppdatera typen.
    await updateProductType(id, { isClip: validated.clipcard });

    return {
      success: true,
      msg: `Produkten ${newProd.name} ändrades.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera produkten." };
  }
}

/**
 * Removes a new product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function removeProduct(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const remProd = await prisma.product.delete({
      where: { id },
    });
    return {
      success: true,
      msg: `Produkten ${remProd.name} togs bort.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort produkten." };
  }
}

/**
 * Adds a course into a product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function addCourseToProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    const isInProd = await isCourseInProduct(
      formData.courseId,
      formData.productId,
    );

    if (isInProd) {
      await prisma.$transaction(async (tx) => {
        const productType = await updateProductType(validated.productId, {
          tx,
        });
        await tx.productOnCourse.update({
          where: {
            courseId_productId: {
              courseId: validated.courseId,
              productId: validated.productId,
            },
          },
          data: {
            lessonsIncluded:
              productType === "CLIP" || validated.unlimited
                ? 0
                : validated.lessonsIncluded,
            unlimited: validated.unlimited ?? false,
          },
        });
      });

      return {
        success: true,
        msg: `Kursen ändrades i produkten.`,
      };
    } else {
      await prisma.$transaction(async (tx) => {
        const productType = await updateProductType(validated.productId, {
          tx,
        });
        await tx.productOnCourse.create({
          data: {
            productId: validated.productId,
            courseId: validated.courseId,
            lessonsIncluded:
              productType === "CLIP" || validated.unlimited
                ? 0
                : validated.lessonsIncluded,
            unlimited: validated.unlimited ?? false,
          },
        });
      });

      return {
        success: true,
        msg: `Kursen lades in i produkten.`,
      };
    }
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kurskopplingen." };
  }
}

/**
 * Removes a course from a product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function removeCourseInProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    await prisma.$transaction(async (tx) => {
      await tx.productOnCourse.delete({
        where: {
          courseId_productId: {
            productId: validated.productId,
            courseId: validated.courseId,
          },
        },
      });
      await updateProductType(validated.productId, { tx });
    });
    return {
      success: true,
      msg: `Kursen togs bort i produkten.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort kursen från produkten." };
  }
}

/**
 * Checks if a course is in a product.
 * @returns found (boolean) and a count of how many lessonsIncluded.
 * @auth Admin
 */
export async function isCourseInProduct(
  courseId: string,
  productId: string,
): Promise<boolean> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return false;

  try {
    const found = await prisma.productOnCourse.findUnique({
      where: { courseId_productId: { courseId, productId } },
    });

    if (found) return true;
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Uppdaterar product.type baserat på om det är klippkort eller hur många kurser som är kopplade.
export async function updateProductType(
  productId: string,
  options?: { isClip?: boolean; tx?: PrismaTx },
): Promise<"COURSE" | "PACK" | "CLIP"> {
  const client = options?.tx ?? prisma;

  const product = await client.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      type: true,
      courses: { select: { courseId: true } },
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  const isClip = options?.isClip ?? product.type === "CLIP";
  const nextType = isClip
    ? "CLIP"
    : product.courses.length > 1
      ? "PACK"
      : "COURSE";

  if (product.type !== nextType) {
    await client.product.update({
      where: { id: product.id },
      data: { type: nextType },
    });
  }

  return nextType;
}

export async function toggleProductActive(
  id: string,
  active: boolean,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { active },
    });
    revalidatePath("/admin/products");
    revalidatePath("/courses");
    return {
      success: true,
      msg: `Produkten "${product.name}" är nu ${active ? "aktiv" : "inaktiv"}.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera produkten." };
  }
}
