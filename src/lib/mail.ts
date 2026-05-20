"use server";

import { Resend } from "resend";
import type { Course, Lesson } from "@/generated/prisma/client";
import { formatDateToInputStr } from "./date-utils";
import { formatPrice } from "./money";
import { getOrderStatusLabel } from "./order-status";

const DEFAULT_FROM =
  process.env.EMAIL_FROM || "Motion Zone <no-reply@motionzoneworld.com>";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Send an email.
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content
 * @param text Plain text fallback
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  try {
    const resend = getResendClient();
    if (!resend) {
      const error = new Error("Missing RESEND_API_KEY");
      console.error(error.message);
      return { success: false, error };
    }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

/**
 * Generates an HTML template for order confirmation.
 * @param order The order data (with user and orderItems)
 * @returns HTML string
 */
export async function generateOrderConfirmationHtml(order: {
  id: string;
  totalPrice: number;
  status: string;
  createdAt: Date | string;
  user: { name: string; email: string };
  orderItems: {
    product: { name: string };
    count: number;
    price: number;
  }[];
}) {
  const itemsHtml = order.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
        item.product.name
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${
        item.count
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ed212d; text-align: center;">Orderbekräftelse</h2>
      <p>Hej ${order.user.name || "Kunde"},</p>
      <p>Tack för din beställning hos Motion Zone! Här är dina orderdetaljer:</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p><strong>Ordernummer:</strong> ${order.id}</p>
        <p><strong>Datum:</strong> ${formatDateToInputStr(order.createdAt)}</p>
        <p><strong>Status:</strong> ${getOrderStatusLabel(order.status, { PENDING_PAYMENT: "Inväntar betalning" })}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #eee;">
            <th style="padding: 10px; text-align: left;">Produkt</th>
            <th style="padding: 10px; text-align: center;">Antal</th>
            <th style="padding: 10px; text-align: right;">Pris</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Totalt:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #ed212d;">${formatPrice(order.totalPrice)}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top: 20px;">
        Om du har några frågor om din beställning, är du välkommen att kontakta oss på <a href="mailto:info@motionzoneworld.com">info@motionzoneworld.com</a>.
      </p>

      <p>Med vänliga hälsningar,<br/>Motion Zone Teamet</p>

      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 12px; color: #888; text-align: center;">
        Detta är ett automatiskt mejl. Du behöver inte svara på det.
      </p>
    </div>
  `;
}

type CancelledLessonMailLesson = Lesson & {
  course?: Pick<Course, "name"> | null;
};

type CancelledLessonMailStudent = {
  name: string;
  email: string;
};

/**
 * Generates an HTML template for a cancelled booking email.
 * @param lesson The cancelled lesson data
 * @param student The recipient student data
 * @returns HTML string
 */
export async function generateBookingCancelledHtml(
  lesson: CancelledLessonMailLesson,
  student: CancelledLessonMailStudent,
) {
  const lessonDate = new Date(lesson.startTime).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const startTime = new Date(lesson.startTime).toLocaleTimeString("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(lesson.endTime).toLocaleTimeString("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
  });
  const courseName = lesson.course?.name ?? "din kurs";

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ed212d; text-align: center;">Inställd lektion</h2>
      <p>Hej ${student.name || "elev"},</p>
      <p>Vi vill meddela att en bokad lektion hos Motion Zone har blivit inställd.</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p><strong>Kurs:</strong> ${courseName}</p>
        <p><strong>Datum:</strong> ${lessonDate}</p>
        <p><strong>Tid:</strong> ${startTime} - ${endTime}</p>
      </div>

      <p>Ditt tillfälle har återställts, så du förlorar ingen bokning på grund av detta.</p>
      ${
        lesson.message
          ? `<p><strong>Meddelande från oss:</strong><br/>${lesson.message} <br/><br/> ${lesson.message_en}</p>`
          : ""
      }
      <p>Om du har några frågor är du välkommen att kontakta oss på <a href="mailto:info@motionzoneworld.com">info@motionzoneworld.com</a>.</p>

      <p>Med vänliga hälsningar,<br/>Motion Zone Teamet</p>

      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 12px; color: #888; text-align: center;">
        Detta är ett automatiskt mejl. Du behöver inte svara på det.
      </p>
    </div>
  `;
}
