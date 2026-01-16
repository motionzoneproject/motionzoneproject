"use server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true", // Adjust based on your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email.
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content
 */
export async function sendMail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Motion Zone <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
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
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.count}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString("sv-SE", { style: "currency", currency: "SEK" })}</td>
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
        <p><strong>Datum:</strong> ${new Date(order.createdAt).toLocaleDateString("sv-SE")}</p>
        <p><strong>Status:</strong> ${order.status}</p>
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
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #ed212d;">${order.totalPrice.toLocaleString("sv-SE", { style: "currency", currency: "SEK" })}</td>
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
