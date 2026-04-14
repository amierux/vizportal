"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logTime(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile) return { error: "Profile not found" };

  const taskId = formData.get("task_id") as string;
  const date = formData.get("date") as string;
  const duration = Number(formData.get("duration") || 0);
  const unit = formData.get("unit") as string; // minutes, hours, days
  const description = (formData.get("description") as string) || null;
  const isBillable = formData.get("is_billable") === "true";

  if (!taskId || !date || !duration) return { error: "Task, date, and duration required" };

  let durationMinutes = duration;
  if (unit === "hours") durationMinutes = Math.round(duration * 60);
  else if (unit === "days") durationMinutes = Math.round(duration * 8 * 60);

  const { error } = await supabase.from("workspace_time_entries").insert({
    task_id: taskId, profile_id: user.id, company_id: profile.company_id,
    duration_minutes: durationMinutes, description, date, is_billable: isBillable,
  });

  if (error) return { error: "Failed to log time" };
  revalidatePath(`/workspace/tasks/${taskId}`);
  return { success: true };
}

export async function getTaskTimeEntries(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_time_entries")
    .select("*, profiles:profile_id(first_name, last_name)")
    .eq("task_id", taskId)
    .order("date", { ascending: false });
  return data ?? [];
}

export async function getMyTimeEntries(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from("workspace_time_entries")
    .select("*, workspace_tasks:task_id(id, name, workspace_lists:list_id(name, workspace_folders:folder_id(name)))")
    .eq("profile_id", user.id)
    .gte("date", startDate).lte("date", endDate)
    .order("date");
  return data ?? [];
}

export async function updateTimeEntry(entryId: string, durationMinutes: number, description: string | null, isBillable: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_time_entries")
    .update({ duration_minutes: durationMinutes, description, is_billable: isBillable })
    .eq("id", entryId);
  if (error) return { error: "Failed to update" };
  return { success: true };
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_time_entries").delete().eq("id", entryId);
  if (error) return { error: "Failed to delete" };
  return { success: true };
}

export async function searchMyTasks(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from("workspace_tasks")
    .select("id, name, workspace_lists:list_id(name)")
    .eq("assignee_id", user.id)
    .ilike("name", `%${query}%`)
    .limit(10);
  return data ?? [];
}
