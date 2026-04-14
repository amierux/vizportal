import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const newYear = now.getFullYear();
  const prevYear = newYear - 1;

  // Find companies whose reset date is today
  const { data: settings } = await supabase
    .from("leave_settings")
    .select("company_id, reset_month, reset_day")
    .eq("reset_month", currentMonth)
    .eq("reset_day", currentDay);

  let processed = 0;

  for (const setting of settings ?? []) {
    // Get all active employees for this company
    const { data: employees } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id", setting.company_id)
      .eq("is_active", true);

    // Get all active leave types for this company
    const { data: leaveTypes } = await supabase
      .from("leave_types")
      .select("*")
      .eq("company_id", setting.company_id)
      .eq("is_active", true);

    for (const emp of employees ?? []) {
      for (const lt of leaveTypes ?? []) {
        // Get previous year balance for carry-over calculation
        let carryOver = 0;
        if (lt.is_carry_over) {
          const { data: prevBalance } = await supabase
            .from("leave_balances")
            .select("remaining_days")
            .eq("profile_id", emp.id)
            .eq("leave_type_id", lt.id)
            .eq("year", prevYear)
            .single();

          if (prevBalance) {
            carryOver = Math.min(prevBalance.remaining_days, lt.max_carry_over_days);
          }
        }

        const totalDays = lt.default_days + carryOver;

        // Upsert new year balance
        const { data: existing } = await supabase
          .from("leave_balances")
          .select("id")
          .eq("profile_id", emp.id)
          .eq("leave_type_id", lt.id)
          .eq("year", newYear)
          .single();

        if (existing) {
          await supabase
            .from("leave_balances")
            .update({
              total_days: totalDays,
              used_days: 0,
              remaining_days: totalDays,
              carried_over_days: carryOver,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("leave_balances").insert({
            profile_id: emp.id,
            company_id: setting.company_id,
            leave_type_id: lt.id,
            year: newYear,
            total_days: totalDays,
            used_days: 0,
            remaining_days: totalDays,
            carried_over_days: carryOver,
          });
        }
      }
    }

    processed++;
  }

  return NextResponse.json({ success: true, companies_processed: processed });
}
