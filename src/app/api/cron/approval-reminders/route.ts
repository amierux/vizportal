import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, buildReminderEmail } from "@/lib/utils/email";
import { formatFullName } from "@/lib/utils/format";
import { APPROVAL_REMINDER_DAYS } from "@/lib/constants";
import { getSystemSetting } from "@/lib/utils/settings";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = await getSystemSetting("cron_secret");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - APPROVAL_REMINDER_DAYS);

  const { data: pendingSteps } = await supabase
    .from("approval_steps")
    .select(`
      id, token, approver_id, created_at,
      approval_requests(type, requester_id, status, current_step,
        requester:profiles!approval_requests_requester_id_fkey(first_name, last_name)
      )
    `)
    .eq("status", "pending")
    .is("reminder_sent_at", null)
    .lt("created_at", cutoffDate.toISOString());

  let sent = 0;

  for (const step of pendingSteps ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = step.approval_requests as any;
    if (!req || req.status !== "pending") continue;

    // Only remind the current step approver
    if (req.current_step !== undefined) {
      // Get step_order for this step
      const { data: stepData } = await supabase
        .from("approval_steps")
        .select("step_order")
        .eq("id", step.id)
        .single();
      if (stepData && stepData.step_order !== req.current_step) continue;
    }

    const { data: approver } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", step.approver_id)
      .single();

    if (!approver?.email) continue;

    const requester = req.requester;
    const requesterName = requester
      ? formatFullName(requester.first_name, requester.last_name)
      : "Unknown";
    const approverName = formatFullName(approver.first_name, approver.last_name);

    const daysPending = Math.floor(
      (Date.now() - new Date(step.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
    const approvalUrl = `${appUrl}/approvals/${step.token}`;
    const email = buildReminderEmail({
      approverName,
      requesterName,
      type: req.type,
      approvalUrl,
      daysPending,
    });

    await sendEmail({ to: approver.email, ...email });

    await supabase
      .from("approval_steps")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", step.id);

    sent++;
  }

  return NextResponse.json({ success: true, reminders_sent: sent });
}
