import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/utils/email";
import { getSystemSetting } from "@/lib/utils/settings";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPreviousWeekDates(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  // Previous Monday
  const day = now.getDay(); // 0=Sun,1=Mon,...
  const daysToLastMonday = day === 0 ? 13 : day + 6; // go back to last week's Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToLastMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: sunday.toISOString().split("T")[0],
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = await getSystemSetting("cron_secret");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { weekStart, weekEnd } = getPreviousWeekDates();

  // Get timesheet settings (reminder emails)
  const { data: tsSettings } = await supabase
    .from("timesheet_settings")
    .select("reminder_email_addresses, company_id")
    .single();

  const reminderEmails: string[] = tsSettings?.reminder_email_addresses ?? [];
  const companyId = tsSettings?.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "No timesheet settings found" }, { status: 200 });
  }

  // Get all active employees
  const { data: activeProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (!activeProfiles || activeProfiles.length === 0) {
    return NextResponse.json({ success: true, non_compliant: 0 });
  }

  // Get submissions for the previous week
  const { data: submissions } = await supabase
    .from("timesheet_submissions")
    .select("profile_id, status")
    .eq("company_id", companyId)
    .eq("week_start_date", weekStart);

  const submittedIds = new Set(
    (submissions ?? [])
      .filter((s) => s.status !== "draft")
      .map((s) => s.profile_id)
  );

  // Non-compliant = active employees without a submitted/approved/rejected submission
  const nonCompliant = activeProfiles.filter((p) => !submittedIds.has(p.id));

  // Send individual notifications
  const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
  for (const person of nonCompliant) {
    await supabase.from("notifications").insert({
      company_id: companyId,
      profile_id: person.id,
      type: "timesheet_missing",
      title: "Timesheet Not Submitted",
      message: `Your timesheet for week of ${weekStart} (${weekStart} – ${weekEnd}) has not been submitted. Please log in and submit it.`,
      link: `/timesheet?week=${weekStart}`,
      is_read: false,
    });
  }

  // Send report email to configured reminder addresses
  if (reminderEmails.length > 0 && nonCompliant.length > 0) {
    const memberList = nonCompliant
      .map((p) => `• ${p.first_name} ${p.last_name} (${p.email})`)
      .join("\n");

    const html = `
      <h2>Timesheet Non-Compliance Report</h2>
      <p>Week: <strong>${weekStart} – ${weekEnd}</strong></p>
      <p>The following ${nonCompliant.length} member(s) have not submitted their timesheet:</p>
      <pre style="font-family: monospace; background: #f5f5f5; padding: 12px; border-radius: 4px;">${memberList}</pre>
      <p><a href="${appUrl}/timesheet">View Timesheets</a></p>
    `;

    for (const email of reminderEmails) {
      await sendEmail({
        to: email,
        subject: `Timesheet Non-Compliance Report — Week of ${weekStart}`,
        html,
      });
    }
  }

  return NextResponse.json({
    success: true,
    week: { start: weekStart, end: weekEnd },
    non_compliant: nonCompliant.length,
    notifications_sent: nonCompliant.length,
    report_emails_sent: reminderEmails.length,
  });
}
