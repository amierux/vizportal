"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SETTING_KEYS } from "@/lib/constants/settings-keys";

/**
 * Get all system settings for the current user's company.
 */
export async function getSystemSettings() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("system_settings")
    .select("*")
    .order("key");

  return data ?? [];
}

/**
 * Update system settings (upsert multiple key-value pairs).
 */
export async function updateSystemSettings(
  _prevState: unknown,
  formData: FormData
) {
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

  for (const setting of SETTING_KEYS) {
    const value = formData.get(setting.key) as string;
    if (value === null || value === undefined) continue;

    // Skip empty secret fields (means "keep existing")
    if (setting.isSecret && value === "") continue;

    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("key", setting.key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, is_secret: setting.isSecret })
        .eq("id", existing.id);

      if (error) return { error: `Failed to update ${setting.label}` };
    } else {
      if (value === "") continue;

      const { error } = await supabase
        .from("system_settings")
        .insert({
          company_id: profile.company_id,
          key: setting.key,
          value,
          is_secret: setting.isSecret,
        });

      if (error) return { error: `Failed to save ${setting.label}` };
    }
  }

  revalidatePath("/settings/system");
  return { success: true };
}
