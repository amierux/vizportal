import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: "VizPortal <noreply@vizserve.com>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Email send exception:", err);
    return { success: false, error: "Failed to send email" };
  }
}

export function buildApprovalEmail(params: {
  requesterName: string;
  type: string;
  details: string;
  approvalUrl: string;
}): { subject: string; html: string } {
  const typeLabel = params.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";

  return {
    subject: `[VizPortal] Approval needed: ${typeLabel} from ${params.requesterName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Approval Required</h2>
        <p><strong>${params.requesterName}</strong> submitted a <strong>${typeLabel}</strong>.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${params.details}
        </div>
        <a href="${params.approvalUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Review & Decide
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          This link will take you to a page where you can approve or reject this request.
        </p>
      </div>
    `,
  };
}

export function buildStatusEmail(params: {
  recipientName: string;
  type: string;
  status: "approved" | "rejected";
  approverName: string;
  comment?: string | null;
}): { subject: string; html: string } {
  const typeLabel = params.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";
  const statusLabel = params.status === "approved" ? "Approved" : "Rejected";
  const statusColor = params.status === "approved" ? "#22c55e" : "#ef4444";

  return {
    subject: `[VizPortal] Your ${typeLabel} was ${statusLabel.toLowerCase()} by ${params.approverName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Request ${statusLabel}</h2>
        <p>Hi ${params.recipientName},</p>
        <p>Your <strong>${typeLabel}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${statusLabel.toLowerCase()}</span> by <strong>${params.approverName}</strong>.</p>
        ${params.comment ? `<p><em>Comment: "${params.comment}"</em></p>` : ""}
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Log in to VizPortal to view details.
        </p>
      </div>
    `,
  };
}

export function buildReminderEmail(params: {
  approverName: string;
  requesterName: string;
  type: string;
  approvalUrl: string;
  daysPending: number;
}): { subject: string; html: string } {
  const typeLabel = params.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";

  return {
    subject: `[VizPortal] Reminder: Pending approval for ${typeLabel} from ${params.requesterName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pending Approval Reminder</h2>
        <p>Hi ${params.approverName},</p>
        <p>You have a pending ${typeLabel} from <strong>${params.requesterName}</strong> that has been waiting for <strong>${params.daysPending} days</strong>.</p>
        <a href="${params.approvalUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Review & Decide
        </a>
      </div>
    `,
  };
}
