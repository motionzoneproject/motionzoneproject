"use server";
import { Resend } from "resend";
import { formatPrice } from "./money";

const resend = new Resend(process.env.RESEND_API_KEY);

const DEFAULT_FROM =
  process.env.EMAIL_FROM || "Motion Zone <no-reply@motionzoneworld.com>";

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return "Inväntar betalning";
      case "APPROVED":
        return "Godkänd";
      case "PAID":
        return "Betald";
      case "CANCELLED":
        return "Avbruten";
      default:
        return status;
    }
  };

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ed212d; text-align: center;">Orderbekräftelse</h2>
      <p>Hej ${order.user.name || "Kunde"},</p>
      <p>Tack för din beställning hos Motion Zone! Här är dina orderdetaljer:</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p><strong>Ordernummer:</strong> ${order.id}</p>
        <p><strong>Datum:</strong> ${new Date(
          order.createdAt,
        ).toLocaleDateString("sv-SE")}</p>
        <p><strong>Status:</strong> ${getStatusLabel(order.status)}</p>
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
