import { Resend } from "resend";
import { config } from "../config";

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (!config.resend.apiKey) {
    return null;
  }
  if (!resend) {
    resend = new Resend(config.resend.apiKey);
  }
  return resend;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const client = getClient();
  if (!client) {
    console.debug("Resend API key not configured, skipping email send");
    return;
  }

  const { error } = await client.emails.send({
    from: config.resend.fromEmail,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send email:", error);
  }
}

export async function sendNotificationEmail(
  userEmail: string,
  notification: {
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
  },
): Promise<void> {
  const crmUrl = config.corsOrigin;
  let ctaHtml = "";
  if (notification.entityType && notification.entityId) {
    const path =
      notification.entityType === "TASK"
        ? `/tasks/${notification.entityId}`
        : notification.entityType === "TICKET"
          ? `/tickets/${notification.entityId}`
          : notification.entityType === "DEAL"
            ? `/deals/${notification.entityId}`
            : null;
    if (path) {
      ctaHtml = `<p style="margin-top:16px;"><a href="${crmUrl}${path}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">פתח ב-CRM</a></p>`;
    }
  }

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#2563eb;padding:16px 24px;">
      <h2 style="margin:0;color:#fff;font-size:18px;">Vixy CRM</h2>
    </div>
    <div style="padding:24px;text-align:right;">
      <h3 style="margin:0 0 8px;font-size:16px;color:#18181b;">${notification.title}</h3>
      ${notification.body ? `<p style="margin:0;color:#52525b;font-size:14px;white-space:pre-line;">${notification.body}</p>` : ""}
      ${ctaHtml}
    </div>
    <div style="padding:12px 24px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
      <p style="margin:0;color:#a1a1aa;font-size:12px;">הודעה זו נשלחה אוטומטית מ-Vixy CRM</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(userEmail, notification.title, html);
}

export async function sendDigestEmail(
  userEmail: string,
  data: {
    todayTasks: number;
    overdueTasks: number;
    staleDeals: number;
    nextTaskTitle?: string;
  },
): Promise<void> {
  const rows: string[] = [];

  rows.push(
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;">משימות להיום</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-weight:bold;color:#18181b;">${data.todayTasks}</td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;">משימות באיחור</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-weight:bold;color:${data.overdueTasks > 0 ? "#dc2626" : "#18181b"};">${data.overdueTasks}</td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;">עסקאות דורשות תשומת לב</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-weight:bold;color:${data.staleDeals > 0 ? "#f59e0b" : "#18181b"};">${data.staleDeals}</td></tr>`,
  );

  const nextTaskHtml = data.nextTaskTitle
    ? `<p style="margin:16px 0 0;color:#52525b;font-size:14px;">המשימה הבאה: <strong>${data.nextTaskTitle}</strong></p>`
    : "";

  const subject = `סיכום יומי: ${data.todayTasks} משימות להיום, ${data.overdueTasks} באיחור`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#2563eb;padding:16px 24px;">
      <h2 style="margin:0;color:#fff;font-size:18px;">סיכום יומי - Vixy CRM</h2>
    </div>
    <div style="padding:24px;text-align:right;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;" dir="rtl">
        ${rows.join("\n        ")}
      </table>
      ${nextTaskHtml}
      <p style="margin-top:20px;"><a href="${config.corsOrigin}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">פתח את ה-CRM</a></p>
    </div>
    <div style="padding:12px 24px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
      <p style="margin:0;color:#a1a1aa;font-size:12px;">הודעה זו נשלחה אוטומטית מ-Vixy CRM</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(userEmail, subject, html);
}
