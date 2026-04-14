"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Get all approval configs + steps for the company.
 */
export async function getApprovalConfigs() {
  const supabase = await createClient();

  const { data: configs } = await supabase
    .from("approval_configs")
    .select("*, approval_config_steps(*)")
    .order("type");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (configs ?? []).map((config: any) => ({
    ...config,
    approval_config_steps: (config.approval_config_steps ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.step_order - b.step_order
    ),
  }));
}

/**
 * Update an approval config: toggle enabled + replace steps.
 */
export async function updateApprovalConfig(
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

  const type = formData.get("_type") as string;
  const isEnabled = formData.get("is_enabled") === "true";
  const stepsJson = formData.get("_steps") as string;

  let steps: { role: string; is_optional: boolean }[] = [];
  try {
    steps = JSON.parse(stepsJson);
  } catch {
    return { error: "Invalid steps data" };
  }

  // Upsert config
  const { data: existing } = await supabase
    .from("approval_configs")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("type", type)
    .single();

  let configId: string;

  if (existing) {
    await supabase
      .from("approval_configs")
      .update({ is_enabled: isEnabled })
      .eq("id", existing.id);
    configId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("approval_configs")
      .insert({
        company_id: profile.company_id,
        type,
        is_enabled: isEnabled,
      })
      .select("id")
      .single();
    if (error || !created) return { error: "Failed to save config" };
    configId = created.id;
  }

  // Delete old steps and insert new ones
  await supabase
    .from("approval_config_steps")
    .delete()
    .eq("approval_config_id", configId);

  for (let i = 0; i < steps.length; i++) {
    await supabase.from("approval_config_steps").insert({
      approval_config_id: configId,
      step_order: i + 1,
      role: steps[i].role,
      is_optional: steps[i].is_optional,
    });
  }

  revalidatePath("/settings/approval");
  return { success: true };
}
