"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getTimesheetSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("timesheet_settings").select("*").single();
  return data;
}

export async function updateTimesheetSettings(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile) return { error: "Profile not found" };

  const emailsRaw = formData.get("reminder_email_addresses") as string;
  const emails = emailsRaw ? emailsRaw.split(",").map((e) => e.trim()).filter(Boolean) : [];
  const deadlineDay = formData.get("submission_deadline_day") as string || "monday";
  const isApprovalEnabled = formData.get("is_approval_enabled") === "true";

  const { data: existing } = await supabase
    .from("timesheet_settings").select("id").eq("company_id", profile.company_id).single();

  const settingsData = {
    reminder_email_addresses: emails,
    submission_deadline_day: deadlineDay,
    is_approval_enabled: isApprovalEnabled,
  };

  if (existing) {
    await supabase.from("timesheet_settings").update(settingsData).eq("id", existing.id);
  } else {
    await supabase.from("timesheet_settings").insert({ ...settingsData, company_id: profile.company_id });
  }

  // Handle approval steps
  const stepsJson = formData.get("_steps") as string;
  if (stepsJson) {
    let steps: { role: string; is_optional: boolean }[] = [];
    try { steps = JSON.parse(stepsJson); } catch { /* ignore */ }

    const { data: config } = await supabase
      .from("timesheet_approval_configs").select("id").eq("company_id", profile.company_id).single();

    if (config) {
      await supabase.from("timesheet_approval_steps").delete().eq("timesheet_approval_config_id", config.id);
      for (let i = 0; i < steps.length; i++) {
        await supabase.from("timesheet_approval_steps").insert({
          timesheet_approval_config_id: config.id,
          step_order: i + 1, role: steps[i].role, is_optional: steps[i].is_optional,
        });
      }
    }
  }

  revalidatePath("/settings/timesheet");
  return { success: true };
}

export async function getTimesheetApprovalConfig() {
  const supabase = await createClient();
  const { data } = await supabase.from("timesheet_approval_configs")
    .select("*, timesheet_approval_steps(*)").single();
  return data;
}
