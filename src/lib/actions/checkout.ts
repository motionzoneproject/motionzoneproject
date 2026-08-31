"use server";

import { redirect } from "next/navigation";
import type { Course } from "@/generated/prisma/client";
import { clearCart } from "@/lib/cart";
import { generateOrderConfirmationHtml, sendMail } from "@/lib/mail";
import { createOrder, getOrderById } from "@/lib/orders";
import prisma from "../prisma";
import { getProductStats } from "./purchase-actions";
import { getSessionData } from "./sessiondata";

export type CheckoutItem = {
  productId: string;
  count: number;
  participantId?: string | null;
  /** Required when product.maxCourses is set – the courses the customer chose */
  selectedCourseIds?: string[];
  selectedCourses?: Course[];
};

export async function createCheckout(params: {
  items: CheckoutItem[];
  postalcode?: string;
  note?: string;
  paymethod?: number;
}) {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  const { items, postalcode, note, paymethod } = params;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No items provided");
  }

  // Prevent duplicate registrations of the same participant to the same product in a single checkout
  const seenRegistrations = new Set<string>();
  for (const itm of items) {
    const participantKey = itm.participantId || "self";
    const registrationKey = `${itm.productId}-${participantKey}`;
    if (seenRegistrations.has(registrationKey)) {
      throw new Error(
        "Samma deltagare kan inte anmälas flera gånger till samma produkt.",
      );
    }
    seenRegistrations.add(registrationKey);
  }

  const pCountTotal = new Map();
  const serverItems: {
    productId: string;
    count: number;
    participantId?: string | null;
    price: number;
    selectedCourseIds?: string[];
  }[] = [];

  // Gör en transaction här då.
  const order = await prisma.$transaction(
    async (tx) => {
      for (const itm of items) {
        const p = await tx.product.findUnique({
          where: { id: itm.productId },
        });
        if (!p) {
          console.error("Checkout: product not found", {
            productId: itm.productId,
          });
          throw new Error(
            "En produkt i varukorgen är inte längre tillgänglig.",
          );
        }

        const stats = await getProductStats(p.id, tx);

        if (!stats.success) {
          console.error("Checkout: failed to get product stats", {
            productId: itm.productId,
          });
          throw new Error("Kunde inte verifiera tillgänglighet just nu.");
        }

        // Server-side validation of course selections for products with maxCourses
        if (p.maxCourses != null) {
          const selected = itm.selectedCourseIds ?? [];
          if (selected.length > p.maxCourses || selected.length === 0) {
            throw new Error(
              `Du måste välja minst 1 kurs och max ${p.maxCourses} kurser för "${p.name}".`,
            );
          }

          if (new Set(selected).size !== selected.length) {
            throw new Error(
              `Du kan inte välja samma kurs flera gånger för "${p.name}".`,
            );
          }
          // Verify all selected courses actually belong to this product
          const linkedCourses = await tx.productOnCourse.findMany({
            where: { productId: p.id },
            select: { courseId: true },
          });
          const validIds = new Set(linkedCourses.map((c) => c.courseId));
          for (const cId of selected) {
            if (!validIds.has(cId)) {
              throw new Error(
                `En vald kurs tillhör inte produkten "${p.name}". Vänligen ladda om sidan och försök igen.`,
              );
            }
          }
        }

        if (
          typeof stats.spotsLeft === "number" &&
          Number.isFinite(stats.spotsLeft) &&
          itm.count > stats.spotsLeft
        ) {
          console.error("Checkout: count exceeds spotsLeft", {
            productId: itm.productId,
            count: itm.count,
            spotsLeft: stats.spotsLeft,
          });
          throw new Error(
            `Det finns inte tillräckligt med platser kvar för "${p.name}".`,
          );
        }

        // Vi behöver kolla totalt också.
        pCountTotal.set(
          itm.productId,
          (pCountTotal.get(itm.productId) ?? 0) + itm.count,
        );

        const totalInCartForProduct = pCountTotal.get(itm.productId) ?? 0;
        if (
          typeof stats.spotsLeft === "number" &&
          Number.isFinite(stats.spotsLeft) &&
          totalInCartForProduct > stats.spotsLeft
        ) {
          console.error("Checkout: cart total exceeds spotsLeft", {
            productId: itm.productId,
            totalInCartForProduct,
            spotsLeft: stats.spotsLeft,
          });
          throw new Error(
            `Det finns inte tillräckligt med platser kvar för "${p.name}".`,
          );
        }

        // Use the server-fetched price directly — never trust the client.
        serverItems.push({
          productId: itm.productId,
          count: itm.count,
          participantId: itm.participantId,
          price: p.price,
          selectedCourseIds: itm.selectedCourseIds,
        });
      }

      const order = await createOrder(tx, {
        userId: session.user.id,
        items: serverItems,
        postalcode,
        note,
        paymethod,
      });

      return order;
    },
    { isolationLevel: "Serializable" },
  );

  // Try to send confirmation email
  try {
    const fullOrder = await getOrderById(order.id);

    // ev. fix: vi kanske ska skicka en kopia även till motionzone?

    if (fullOrder?.user.email) {
      const html = await generateOrderConfirmationHtml(fullOrder);
      await sendMail(
        fullOrder.user.email,
        `Orderbekräftelse - Order #${order.id}`,
        html,
      );

      fullOrder.orderItems.map(async (it) => {
        if (
          it.participant?.email !== fullOrder.user.email &&
          it.participant?.email
        ) {
          // Här kan vi skicka till deltagaren med? ja.

          const html = await generateOrderConfirmationHtml({
            ...fullOrder,
          });

          await sendMail(
            it.participant?.email,
            `Orderbekräftelse, kopia till deltagare - Order #${order.id}`,
            html,
          );
        }
      });
    }
  } catch (emailError) {
    // We don't want to fail the checkout if the email fails, but we should log it
    console.error("Failed to send confirmation email:", emailError);
  }

  // Clear cart after order
  await clearCart();

  return {
    orderId: order.id,
    status: order.status ?? "AWAITING_APPROVAL",
    successRedirect: `/checkout/success?orderId=${order.id}`,
  } as const;
}

export async function createCheckoutAndRedirect(params: {
  items: CheckoutItem[];
  postalcode?: string;
  note?: string;
}) {
  const result = await createCheckout(params);
  redirect(result.successRedirect);
}
