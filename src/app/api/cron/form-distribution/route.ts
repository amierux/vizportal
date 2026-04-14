import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSystemSetting } from "@/lib/utils/settings";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Check if a cron expression matches the given date (simplified — supports basic patterns).
 * Format: "minute hour day month dayOfWeek" (e.g., "0 9 1 * *" = 9 AM on 1st of every month)
 * We only check day + month + dayOfWeek since this runs daily.
 */
function cronMatchesToday(cron: string, date: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [, , dayExpr, monthExpr, dowExpr] = parts;

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  const matches = (expr: string, value: number): boolean => {
    if (expr === "*") return true;
    if (expr.includes(",")) {
      return expr.split(",").map(Number).includes(value);
    }
    return Number(expr) === value;
  };

  return matches(dayExpr, day) && matches(monthExpr, month) && matches(dowExpr, dayOfWeek);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = await getSystemSetting("cron_secret");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const { data: forms } = await supabase
    .from("forms")
    .select("*")
    .eq("schedule_enabled", true)
    .eq("status", "published");

  let totalAssigned = 0;

  for (const form of forms ?? []) {
    if (!form.schedule_cron || !cronMatchesToday(form.schedule_cron, now)) continue;

    // Resolve target profile IDs
    let profileIds: string[] = [];
    const target = form.schedule_target;
    const targetIds: string[] = form.schedule_target_ids ?? [];

    if (target === "all_employees") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", form.company_id)
        .eq("is_active", true);
      profileIds = (profiles ?? []).map((p) => p.id);
    } else if (target === "department") {
      const { data: details } = await supabase
        .from("employee_details")
        .select("profile_id")
        .in("department_id", targetIds);
      profileIds = (details ?? []).map((d) => d.profile_id);
    } else if (target === "specific") {
      profileIds = targetIds;
    }

    // Create assignments (upsert — skip duplicates for today)
    for (const profileId of profileIds) {
      const { error } = await supabase.from("form_assignments").insert({
        form_id: form.id,
        profile_id: profileId,
      });
      if (!error) {
        totalAssigned++;
        // Send notification
        await supabase.from("notifications").insert({
          company_id: form.company_id,
          profile_id: profileId,
          type: "form_assigned",
          title: "New Form Assigned",
          message: `You have been assigned to fill out: ${form.name}`,
          link: "/forms/my-forms",
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    forms_checked: forms?.length ?? 0,
    assignments_created: totalAssigned,
  });
}
