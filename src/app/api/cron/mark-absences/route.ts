import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSystemSetting } from "@/lib/utils/settings";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = await getSystemSetting("cron_secret");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
  const todayDayOfWeek = DAY_MAP[new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" })
  ).getDay()];

  // Get all employees with schedules who should work today
  const { data: schedules } = await supabase
    .from("employee_schedules")
    .select("profile_id, company_id, start_time, end_time, work_days")
    .contains("work_days", [todayDayOfWeek]);

  let marked = 0;

  for (const sched of schedules ?? []) {
    // Check if already has a summary for today
    const { data: existing } = await supabase
      .from("daily_attendance_summary")
      .select("id")
      .eq("profile_id", sched.profile_id)
      .eq("date", today)
      .single();

    if (existing) continue;

    // Check if on approved leave
    const { data: leaveReq } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("profile_id", sched.profile_id)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1);

    const isOnLeave = leaveReq && leaveReq.length > 0;

    // Calculate required hours
    const [sH, sM] = sched.start_time.split(":").map(Number);
    const [eH, eM] = sched.end_time.split(":").map(Number);
    const requiredHours = (eH + eM / 60) - (sH + sM / 60);

    await supabase.from("daily_attendance_summary").insert({
      profile_id: sched.profile_id,
      company_id: sched.company_id,
      date: today,
      total_hours: 0,
      required_hours: requiredHours,
      status: isOnLeave ? "on_leave" : "absent",
    });

    marked++;
  }

  return NextResponse.json({ success: true, absences_marked: marked });
}
