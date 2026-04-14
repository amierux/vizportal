"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Checklist Templates ──────────────────────────────────────────────────────

/**
 * Get all checklist templates for the current user's company.
 */
export async function getChecklistTemplates() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return [];

  const { data } = await supabase
    .from("workspace_checklist_templates")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Create a checklist template.
 * formData fields: name, items (JSON string — array of { name: string })
 */
export async function createChecklistTemplate(_prevState: unknown, formData: FormData) {
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

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Template name is required" };

  const itemsRaw = (formData.get("items") as string) || "[]";
  let items: { name: string }[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: "Invalid items format" };
  }

  const { error } = await supabase.from("workspace_checklist_templates").insert({
    company_id: profile.company_id,
    name: name.trim(),
    items,
    created_by: user.id,
  });

  if (error) return { error: "Failed to create checklist template" };

  revalidatePath("/settings/workspace");
  return { success: true };
}

/**
 * Delete a checklist template.
 */
export async function deleteChecklistTemplate(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspace_checklist_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete checklist template" };

  revalidatePath("/settings/workspace");
  return { success: true };
}

// ─── List Templates ───────────────────────────────────────────────────────────

/**
 * Get all list templates for the current user's company.
 */
export async function getListTemplates() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return [];

  const { data } = await supabase
    .from("workspace_list_templates")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Create a list template.
 * formData fields: name, template_data (JSON string)
 */
export async function createListTemplate(_prevState: unknown, formData: FormData) {
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

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Template name is required" };

  const templateDataRaw = (formData.get("template_data") as string) || "{}";
  let templateData: Record<string, unknown> = {};
  try {
    templateData = JSON.parse(templateDataRaw);
  } catch {
    return { error: "Invalid template data format" };
  }

  const { error } = await supabase.from("workspace_list_templates").insert({
    company_id: profile.company_id,
    name: name.trim(),
    template_data: templateData,
    created_by: user.id,
  });

  if (error) return { error: "Failed to create list template" };

  revalidatePath("/settings/workspace");
  return { success: true };
}

/**
 * Delete a list template.
 */
export async function deleteListTemplate(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspace_list_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete list template" };

  revalidatePath("/settings/workspace");
  return { success: true };
}

/**
 * Snapshot a live list as a list template.
 * Reads statuses + tasks (with checklists), serializes to template_data JSON, creates template.
 */
export async function saveListAsTemplate(listId: string, name: string) {
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

  // Fetch the list
  const { data: list } = await supabase
    .from("workspace_lists")
    .select("*")
    .eq("id", listId)
    .single();
  if (!list) return { error: "List not found" };

  // Fetch statuses
  let statuses: unknown[] = [];
  if (list.status_override) {
    const { data: listStatuses } = await supabase
      .from("workspace_list_statuses")
      .select("name, color, position, is_done, requires_approval")
      .eq("list_id", listId)
      .order("position", { ascending: true });
    statuses = listStatuses ?? [];
  } else {
    const { data: folderStatuses } = await supabase
      .from("workspace_folder_statuses")
      .select("name, color, position, is_done, requires_approval")
      .eq("folder_id", list.folder_id)
      .order("position", { ascending: true });
    statuses = folderStatuses ?? [];
  }

  // Fetch tasks with checklists
  const { data: tasks } = await supabase
    .from("workspace_tasks")
    .select(
      `
      name, description, priority, position,
      workspace_task_checklists(
        name, position,
        workspace_checklist_items(name, position)
      )
    `
    )
    .eq("list_id", listId)
    .is("parent_task_id", null)
    .order("position", { ascending: true });

  const templateData = {
    description: list.description,
    statuses,
    tasks: tasks ?? [],
  };

  const { error } = await supabase.from("workspace_list_templates").insert({
    company_id: profile.company_id,
    name: name.trim(),
    template_data: templateData,
    created_by: user.id,
  });

  if (error) return { error: "Failed to save list as template" };

  revalidatePath("/settings/workspace");
  return { success: true };
}
