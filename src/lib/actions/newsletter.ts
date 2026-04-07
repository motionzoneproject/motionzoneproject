"use server";

import { markdownToTxt } from "markdown-to-txt";
import { marked } from "marked";
import { z } from "zod";
import { sendMail } from "@/lib/mail";
import { isAdminRole } from "./admin";

const recipientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().trim().max(320),
});

const sendStudentNewsletterSchema = z.object({
  recipients: z.array(recipientSchema).min(1).max(500),
  headline: z.string().trim().min(1).max(250),
  content: z.string().trim().min(1).max(80000),
});

type Recipient = z.infer<typeof recipientSchema>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildNewsletterHtml(
  headline: string,
  contentHtml: string,
  name: string,
) {
  return `<!doctype html>
<html lang="sv">
  <body style="margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif;">
    <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
      <div style="padding: 24px 24px 12px; background: #0f172a; color: #ffffff;">
        <div style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #85e4e9;">Motion Zone</div>
        <h1 style="margin: 8px 0 0; font-size: 28px; line-height: 1.2; color: #ffffff;">${escapeHtml(headline)}</h1>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; line-height: 1.7; color: #1e293b;">Hej ${escapeHtml(name)},</p>
        ${contentHtml}
        <p style="margin: 24px 0 0; line-height: 1.7; color: #1e293b;">Med vänliga hälsningar,<br />Motion Zone</p>
      </div>
    </div>
  </body>
</html>`;
}

function buildNewsletterText(
  headline: string,
  contentText: string,
  name: string,
) {
  return `Hej ${name},

${headline}

${contentText}

Med vänliga hälsningar,
Motion Zone`;
}

export async function sendStudentNewsletter(input: {
  recipients: Recipient[];
  headline: string;
  content: string;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) {
    return { success: false, msg: "Ingen behörighet." };
  }

  try {
    const validated = await sendStudentNewsletterSchema.parseAsync(input);

    const emailMap = new Map<string, string[]>();

    // fixed: dedup removing emails for particpants. This joins it in the same instead! :)

    for (const recipient of validated.recipients) {
      const key = recipient.email.toLowerCase();
      const existing = emailMap.get(key) ?? [];
      emailMap.set(key, [...existing, recipient.name]);
    }

    const recipients = Array.from(emailMap.entries()).map(([email, names]) => ({
      email,
      name: names.join(", "),
    }));

    const contentHtml = await marked.parse(validated.content);
    const contentText = markdownToTxt(validated.content);

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const html = buildNewsletterHtml(
          validated.headline,
          contentHtml,
          recipient.name,
        );
        const text = buildNewsletterText(
          validated.headline,
          contentText,
          recipient.name,
        );
        const result = await sendMail(
          recipient.email,
          validated.headline,
          html,
          text,
        );

        return {
          email: recipient.email,
          name: recipient.name,
          success: result.success,
        };
      }),
    );

    const sentCount = results.filter((result) => result.success).length;
    const failed = results.filter((result) => !result.success);

    if (sentCount === 0) {
      return {
        success: false,
        msg: "Kunde inte skicka några mail.",
        data: {
          sentCount,
          failedCount: failed.length,
          results,
        },
      };
    }

    return {
      success: failed.length === 0,
      msg:
        failed.length === 0
          ? `Skickade ${sentCount} mail.`
          : `Skickade ${sentCount} mail, men ${failed.length} misslyckades.`,
      data: {
        sentCount,
        failedCount: failed.length,
        results,
      },
    };
  } catch (error) {
    console.error("sendStudentNewsletter error:", error);
    return { success: false, msg: "Kunde inte skicka mailutskicket." };
  }
}
