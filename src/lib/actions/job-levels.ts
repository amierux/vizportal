"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { jobLevelSchema } from "@/lib/validations/settings";

export async function getJobLevels() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile) return [];

  const { data } = await supabase.from("job_levels").select("*").eq("company_id", profile.company_id).order("rank");
  return data ?? [];
}

export async function createJobLevel(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const parsed = jobLevelSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    rank: Number(formData.get("rank")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile) return { error: "Profile not found" };

  const { error } = await supabase.from("job_levels").insert({ company_id: profile.company_id, ...parsed.data });
  if (error) {
    if (error.code === "23505") return { error: "Job level code already exists" };
    return { error: "Failed to create job level" };
  }

  revalidatePath("/settings/job-levels");
  return { success: true };
}

export async function updateJobLevel(id: string, formData: FormData) {
  const supabase = await createClient();
  const parsed = jobLevelSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    rank: Number(formData.get("rank")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.from("job_levels").update(parsed.data).eq("id", id);
  if (error) return { error: "Failed to update job level" };

  revalidatePath("/settings/job-levels");
  return { success: true };
}

export async function deleteJobLevel(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_levels").delete().eq("id", id);
  if (error) return { error: "Failed to delete. It may be assigned to employees." };

  revalidatePath("/settings/job-levels");
  return { success: true };
}
