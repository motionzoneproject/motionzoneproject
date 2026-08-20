"use server";

import { Resend } from "resend";
import type { Course, Lesson } from "@/generated/prisma/client";
import { formatDateToInputStr, formatLongFriendlyDate } from "./date-utils";
import { formatPrice } from "./money";
import { getOrderStatusLabel } from "./order-status";
import { dbToFormTime } from "./time-convert";
import { getCourseName, getPayMethodTxt } from "./tools";

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

type OrderForEmail = {
  id: string;
  totalPrice: number;
  status: string;
  payMethod: number;
  note: string | null;
  createdAt: Date | string;
  user: { name: string; email: string };
  orderItems: {
    product: { name: string };
    participant?: { name: string } | null;
    count: number;
    price: number;
    courseSelections?:
      | {
          course?: Course;
        }[]
      | null;
  }[];
};

/**
 * Generates an HTML template for order confirmation.
 * @param order The order data (with user and orderItems)
 * @returns HTML string
 */
function getCourseSelectionSummary(item: OrderForEmail["orderItems"][number]) {
  const selections = item.courseSelections ?? [];

  const names = selections.flatMap((sel) => {
    if (!sel.course) return [];
    const name = getCourseName(sel.course);
    return name?.trim() ? [name] : [];
  });

  if (names.length === 0) return "";

  const listItems = names.map((name) => `<li>${name}</li>`).join("");

  return `<div style="margin-top: 6px; font-size: 12px; color: #555;">Paketval:<ul style="margin: 4px 0 0 16px; padding: 0;">${listItems}</ul></div>`;
}

export async function generateOrderConfirmationHtml(order: OrderForEmail) {
  const itemsHtml = order.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
        item.product.name
      } ${item.participant?.name ? `(deltagare: ${item.participant.name})` : ` `}
        ${getCourseSelectionSummary(item)}
      </td>
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
        <p><strong>Betalningsmetod:</strong> ${getPayMethodTxt(order.payMethod)}</p>
        <p><strong>Notering:</strong> ${order.note}</p>
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
        Om du har några frågor om din beställning, är du välkommen att kontakta oss på <a href="mailto:motionzonevaxjo@gmail.com">motionzonevaxjo@gmail.com</a>.
      </p>

      <p>Med vänliga hälsningar,<br/>Motion Zone Teamet</p>

      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 12px; color: #888; text-align: center;">
        Detta är ett automatiskt mejl. Du behöver inte svara på det.
      </p>
    </div>
  `;
}

/**
 * Generates an HTML template for a spot-granted (beviljad) order email.
 * @param order The order data (with user and orderItems)
 * @returns HTML string
 */
export async function generateOrderApprovedHtml(order: OrderForEmail) {
  const itemsHtml = order.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
        item.product.name
      } ${item.participant?.name ? `(deltagare: ${item.participant.name})` : ` `}
        ${getCourseSelectionSummary(item)}
      </td>
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
      <h2 style="color: #4CAF50; text-align: center;">Din plats är beviljad! 🎉</h2>
      <p>Hej ${order.user.name || "Kund"},</p>
      <p>Goda nyheter! Du har fått en plats beviljad för order <strong>#${order.id}</strong>. Vi ser fram emot att välkomna dig!</p>
      <p>Faktura skickas ut till dig <strong>ca 2 veckor efter första lektionen</strong>.</p>
      <p>Logga in på webbsidan med kontot ${order.user.email} för att se dina detaljer och hantera dina bokningar.</p>
      <p><strong>Varmt välkommen! 🕺💃</strong></p>

      <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Ordersammanfattning</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
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
        Om du har några frågor, är du välkommen att kontakta oss på <a href="mailto:motionzonevaxjo@gmail.com">motionzonevaxjo@gmail.com</a>.
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
  const lessonDate = formatLongFriendlyDate(new Date(lesson.startTime));
  const startTime = dbToFormTime(new Date(lesson.startTime));
  const endTime = dbToFormTime(new Date(lesson.endTime));
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
      <p>Om du har några frågor är du välkommen att kontakta oss på <a href="mailto:motionzonevaxjo@gmail.com">motionzonevaxjo@gmail.com</a>.</p>

      <p>Med vänliga hälsningar,<br/>Motion Zone Teamet</p>

      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 12px; color: #888; text-align: center;">
        Detta är ett automatiskt mejl. Du behöver inte svara på det.
      </p>
    </div>
  `;
}

/**
 * Generates an HTML template for a password reset email.
 * @param name The recipient's name
 * @param url The reset link generated by better-auth
 * @returns HTML string
 */
export async function generatePasswordResetHtml(name: string, url: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ed212d; text-align: center;">Återställ ditt lösenord</h2>
      <p>Hej ${name || "där"},</p>
      <p>Vi fick en begäran om att återställa lösenordet till ditt Motion Zone-konto. Klicka på knappen nedan för att välja ett nytt lösenord.</p>

      <p style="text-align: center; margin: 28px 0;">
        <a href="${url}" style="background-color: #ed212d; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">Välj nytt lösenord</a>
      </p>

      <p style="font-size: 13px; color: #555;">Länken gäller i 30 minuter och kan bara användas en gång. Fungerar inte knappen kan du klistra in den här adressen i webbläsaren:</p>
      <p style="font-size: 12px; color: #888; word-break: break-all;">${url}</p>

      <p><strong>Har du inte begärt detta?</strong> Då behöver du inte göra något — ditt lösenord ändras inte förrän länken används.</p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />

      <h3 style="color: #333; font-size: 15px;">In English</h3>
      <p style="font-size: 13px; color: #555;">We received a request to reset the password for your Motion Zone account. Use the button above to choose a new one. The link is valid for 30 minutes and can only be used once. If you did not request this, you can ignore this email — your password stays unchanged until the link is used.</p>

      <p>Med vänliga hälsningar,<br/>Motion Zone Teamet</p>

      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 12px; color: #888; text-align: center;">
        Detta är ett automatiskt mejl. Du behöver inte svara på det.
      </p>
    </div>
  `;
}
