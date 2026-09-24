"use server";

import { revalidatePath } from "next/cache";
import { checkInvoiceName, INVOICE_NAME_ERRORS } from "@/lib/invoice-recipient";
import {
  type InvoiceRecipientInput,
  InvoiceRecipientSchema,
} from "@/validations/userforms";
import prisma from "../prisma";
import { isAdminRole } from "./admin";
import { getSessionData } from "./sessiondata";

type Result = { success: boolean; msg?: string };

/**
 * Sparar kundens fakturamottagare på kontot, som förifyllning i kassan.
 *
 * Kontot står ofta i dansarens namn och säger därför ingenting om vem som ska
 * betala. Samma regel som i kassan gäller: är kontoinnehavaren omyndig kan
 * fakturan inte ställas till samma person.
 */
export async function saveInvoiceRecipient(
  values: InvoiceRecipientInput,
): Promise<Result> {
  const session = await getSessionData();
  if (!session) return { success: false, msg: "Ej inloggad." };

  const parsed = InvoiceRecipientSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      msg: parsed.error.issues[0]?.message ?? "Kontrollera uppgifterna.",
    };
  }

  const details = await prisma.userDetails.findUnique({
    where: { userId: session.user.id },
    select: { dateOfBirth: true },
  });

  // Kundens egna deltagare — oftast barnen. Sparas uppgiften här blir den
  // förifylld i kassan, så samma krav måste gälla redan nu.
  const participants = await prisma.participant.findMany({
    where: { addedByUserId: session.user.id },
    select: { name: true, dateOfBirth: true },
  });

  const nameProblem = checkInvoiceName({
    invoiceName: parsed.data.invoiceName,
    accountName: session.user.name,
    accountDateOfBirth: details?.dateOfBirth,
    participants,
  });
  if (nameProblem)
    return { success: false, msg: INVOICE_NAME_ERRORS[nameProblem] };

  await prisma.userDetails.upsert({
    where: { userId: session.user.id },
    update: {
      invoiceName: parsed.data.invoiceName,
      invoiceEmail: parsed.data.invoiceEmail,
      invoicePhone: parsed.data.invoicePhone || null,
    },
    create: {
      userId: session.user.id,
      invoiceName: parsed.data.invoiceName,
      invoiceEmail: parsed.data.invoiceEmail,
      invoicePhone: parsed.data.invoicePhone || null,
    },
  });

  revalidatePath("/user");
  revalidatePath("/checkout");

  return { success: true, msg: "Fakturauppgifterna är sparade." };
}

/**
 * Admin fyller i fakturamottagaren på en befintlig order.
 *
 * Ordrar lagda innan fältet fanns saknar uppgiften, och studion har den ofta
 * redan i sin mejlkonversation med kunden. Skrivs bara på ordern — kontots
 * förifyllning lämnas orörd, eftersom admin fyller i åt kunden och inte
 * nödvändigtvis vet vad kunden vill ha nästa gång.
 */
export async function setOrderInvoiceRecipient(
  orderId: string,
  values: InvoiceRecipientInput,
): Promise<Result> {
  if (!(await isAdminRole()))
    return { success: false, msg: "Ingen behörighet." };

  const parsed = InvoiceRecipientSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      msg: parsed.error.issues[0]?.message ?? "Kontrollera uppgifterna.",
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      user: {
        select: { name: true, details: { select: { dateOfBirth: true } } },
      },
      orderItems: {
        select: {
          participant: { select: { name: true, dateOfBirth: true } },
        },
      },
    },
  });
  if (!order) return { success: false, msg: "Ordern hittades inte." };

  const nameProblem = checkInvoiceName({
    invoiceName: parsed.data.invoiceName,
    accountName: order.user.name,
    accountDateOfBirth: order.user.details?.dateOfBirth,
    participants: order.orderItems
      .map((it) => it.participant)
      .filter((p) => p !== null),
  });
  if (nameProblem)
    return { success: false, msg: INVOICE_NAME_ERRORS[nameProblem] };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      invoiceName: parsed.data.invoiceName,
      invoiceEmail: parsed.data.invoiceEmail,
      invoicePhone: parsed.data.invoicePhone || null,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/view");

  return { success: true, msg: "Fakturauppgifterna är sparade på ordern." };
}
