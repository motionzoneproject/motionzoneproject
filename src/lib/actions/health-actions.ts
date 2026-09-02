"use server";

// Åtgärder för felsökningssidan. Varje export här blir en publik endpoint,
// så alla kontrollerar admin själva — sidvakten på /admin/health räcker inte.

import { revalidatePath } from "next/cache";
import { getHealthIssues, type HealthIssue } from "../admin-health";
import prisma from "../prisma";
import { isAdminRole } from "./admin";
import { adminSetRole } from "./user-management";

type Result = { success: boolean; msg: string };

/**
 * Kör felsökningskontrollerna på begäran.
 *
 * Tidigare kördes de vid varje sidladdning, vilket kostade ~20 frågor på en
 * översikt som redan var långsam. Nyttan är dessutom episodisk — man letar fel
 * ibland, inte varje gång man öppnar /admin — så det är ett knapptryck nu.
 *
 * @auth Admin
 */
export async function runHealthChecks(): Promise<
  { success: true; issues: HealthIssue[] } | { success: false; msg: string }
> {
  if (!(await isAdminRole())) {
    return { success: false, msg: "Ingen behörighet." };
  }

  try {
    return { success: true, issues: await getHealthIssues() };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte köra kontrollerna." };
  }
}

/**
 * Slår ihop dubbletter av samma deltagare till en.
 *
 * Participant refereras bara från Purchase.participantId och
 * OrderItem.participantId, så sammanslagningen är att peka om de två
 * kolumnerna och radera resten. Allt sker i en transaktion: antingen flyttas
 * alla kopplingar och dubbletterna försvinner, eller så ändras ingenting.
 *
 * Vilken kopia som överlever är adminens val, inte vår gissning — namn,
 * e-post, födelsedatum och fotosamtycke kan skilja sig mellan kopiorna, och
 * att slå ihop dem automatiskt skulle kunna bredda ett samtycke tyst.
 *
 * @auth Admin
 */
export async function mergeParticipants(
  keepId: string,
  removeIds: string[],
): Promise<Result> {
  if (!(await isAdminRole())) {
    return { success: false, msg: "Ingen behörighet." };
  }

  if (removeIds.length === 0) {
    return { success: false, msg: "Inga dubbletter att slå ihop." };
  }

  if (removeIds.includes(keepId)) {
    return {
      success: false,
      msg: "Kan inte slå ihop en deltagare med sig själv.",
    };
  }

  try {
    const involved = await prisma.participant.findMany({
      where: { id: { in: [keepId, ...removeIds] } },
      select: { id: true, addedByUserId: true },
    });

    if (involved.length !== removeIds.length + 1) {
      return { success: false, msg: "Någon av deltagarna finns inte längre." };
    }

    // Skydd mot att slå ihop deltagare som tillhör olika användare — det vore
    // att flytta ett barn mellan två familjer.
    const owners = new Set(involved.map((row) => row.addedByUserId));
    if (owners.size > 1) {
      return {
        success: false,
        msg: "Deltagarna är tillagda av olika användare och får inte slås ihop.",
      };
    }

    const { orderItems, purchases } = await prisma.$transaction(async (tx) => {
      const movedOrderItems = await tx.orderItem.updateMany({
        where: { participantId: { in: removeIds } },
        data: { participantId: keepId },
      });

      const movedPurchases = await tx.purchase.updateMany({
        where: { participantId: { in: removeIds } },
        data: { participantId: keepId },
      });

      await tx.participant.deleteMany({ where: { id: { in: removeIds } } });

      return {
        orderItems: movedOrderItems.count,
        purchases: movedPurchases.count,
      };
    });

    revalidatePath("/admin");
    revalidatePath("/admin/health/duplicate-participant");
    revalidatePath("/admin/students");

    return {
      success: true,
      msg: `${removeIds.length} dubbletter borttagna. ${orderItems} ordrar och ${purchases} köp flyttades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte slå ihop deltagarna." };
  }
}

/**
 * Ger en användare som redan undervisar aktiva kurser rollen "teacher", så
 * hen kan logga in och hantera sina egna lektioner.
 *
 * Höjer bara från en icke-lärarroll: en admin ska aldrig degraderas härifrån.
 *
 * @auth Admin
 */
export async function grantTeacherRole(userId: string): Promise<Result> {
  if (!(await isAdminRole())) {
    return { success: false, msg: "Ingen behörighet." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        name: true,
        _count: { select: { teachingCourses: { where: { active: true } } } },
      },
    });

    if (!user) return { success: false, msg: "Användaren finns inte." };

    if (user.role === "admin" || user.role === "teacher") {
      return { success: true, msg: `${user.name} har redan behörighet.` };
    }

    // Bara den som faktiskt undervisar ska kunna få rollen härifrån — annars
    // vore det här en genväg till att dela ut behörighet till vem som helst.
    if (user._count.teachingCourses === 0) {
      return {
        success: false,
        msg: "Användaren undervisar inga aktiva kurser.",
      };
    }

    const result = await adminSetRole(userId, "teacher");
    if (!result.success) {
      return {
        success: false,
        msg: result.error ?? "Kunde inte sätta rollen.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/health/teacher-without-role");
    revalidatePath("/admin/users");

    return { success: true, msg: `${user.name} är nu lärare.` };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte sätta rollen." };
  }
}
