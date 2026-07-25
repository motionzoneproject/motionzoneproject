"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import { adminCategorySchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { isAdminRole } from "./admin";

/** kategorier */
export async function addCategory(
  formData: z.output<typeof adminCategorySchema>,
): Promise<{ success: boolean; msg: string; field?: "name" | "name_en" }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminCategorySchema.parseAsync(formData);

    const nameConflict = await prisma.category.findFirst({
      where: { name: { equals: validated.name, mode: "insensitive" } },
      select: { id: true },
    });

    if (nameConflict) {
      return {
        success: false,
        msg: `En kategori med namnet "${validated.name}" finns redan.`,
        field: "name",
      };
    }

    if (validated.name_en?.trim()) {
      const nameEnConflict = await prisma.category.findFirst({
        where: { name_en: { equals: validated.name_en, mode: "insensitive" } },
        select: { id: true },
      });

      if (nameEnConflict) {
        return {
          success: false,
          msg: `En kategori med det engelska namnet "${validated.name_en}" finns redan.`,
          field: "name_en",
        };
      }
    }

    const newCategory = await prisma.category.create({
      data: {
        name: validated.name,
        name_en: validated.name_en,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/courses");
    return { success: true, msg: `Kategorin "${newCategory.name}" skapades.` };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa kategorin." };
  }
}

export async function editCategory(
  id: string,
  formData: z.output<typeof adminCategorySchema>,
): Promise<{ success: boolean; msg: string; field?: "name" | "name_en" }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminCategorySchema.parseAsync(formData);

    const nameConflict = await prisma.category.findFirst({
      where: {
        name: { equals: validated.name, mode: "insensitive" },
        id: { not: id },
      },
      select: { id: true },
    });

    if (nameConflict) {
      return {
        success: false,
        msg: `En kategori med namnet "${validated.name}" finns redan.`,
        field: "name",
      };
    }

    if (validated.name_en?.trim()) {
      const nameEnConflict = await prisma.category.findFirst({
        where: {
          name_en: { equals: validated.name_en, mode: "insensitive" },
          id: { not: id },
        },
        select: { id: true },
      });

      if (nameEnConflict) {
        return {
          success: false,
          msg: `En kategori med det engelska namnet "${validated.name_en}" finns redan.`,
          field: "name_en",
        };
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: validated.name,
        name_en: validated.name_en,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/courses");
    return { success: true, msg: `Kategorin "${updated.name}" uppdaterades.` };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kategorin." };
  }
}
export async function getCategoryProductCount(id: string): Promise<number> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return 0;

  return prisma.product.count({ where: { categoryId: id } });
}

export async function deleteCategory(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // onDelete: SetNull i schemat gör detta säkert rent tekniskt,
    // men varning ges innan i UI:t om kategorin är kopplad till produkter.
    const deleted = await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/admin/products");
    revalidatePath("/courses");
    return { success: true, msg: `Kategorin "${deleted.name}" togs bort.` };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort kategorin." };
  }
}

// Ingen admin check för denna använder vi i public med.
export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

/** slut på kategorier */
