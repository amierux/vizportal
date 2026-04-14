"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leaveSettingsSchema } from "@/lib/validations/leave";

/**
 * Get leave settings for the user's company.
 */
export async function getLeaveSettings() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leave_settings")
    .select("*")
    .single();

  return data;
}

/**
 * Update leave settings (admin only).
 */
export async function updateLeaveSettings(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  const rawData = {
    reset_month: Number(formData.get("reset_month")),
    reset_day: Number(formData.get("reset_day")),
  };

  const parsed = leaveSettingsSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Upsert: check for existing settings row
  const { data: existing } = await supabase
    .from("leave_settings")
    .select("id")
    .eq("company_id", profile.company_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("leave_settings")
      .update(parsed.data)
      .eq("id", existing.id);

    if (error) return { error: "Failed to update settings" };
  } else {
    const { error } = await supabase
      .from("leave_settings")
      .insert({
        ...parsed.data,
        company_id: profile.company_id,
      });

    if (error) return { error: "Failed to create settings" };
  }

  revalidatePath("/leave/settings");
  return { success: true };
}
