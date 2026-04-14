"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listSchema } from "@/lib/validations/workspace";

/**
 * Create a new list in a folder.
 * formData fields: folder_id, name, description
 */
export async function createList(_prevState: unknown, formData: FormData) {
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

  const folderId = formData.get("folder_id") as string;
  if (!folderId) return { error: "Folder ID required" };

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = listSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Get next position
  const { data: existing } = await supabase
    .from("workspace_lists")
    .select("position")
    .eq("folder_id", folderId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  const { data: list, error: insertError } = await supabase
    .from("workspace_lists")
    .insert({
      folder_id: folderId,
      company_id: profile.company_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      position: nextPosition,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !list) return { error: "Failed to create list" };

  revalidatePath(`/workspace/folders/${folderId}`);
  return { success: true, listId: list.id };
}

/**
 * Get all non-archived lists in a folder, ordered by position.
 */
export async function getLists(folderId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workspace_lists")
    .select("*")
    .eq("folder_id", folderId)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  return data ?? [];
}

/**
 * Get a single list with its applicable statuses.
 * If status_override is true, returns list-level statuses.
 * Otherwise, returns the folder-level statuses via folder_id.
 */
export async function getList(listId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: list } = await supabase
    .from("workspace_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (!list) return null;

  let statuses: unknown[] = [];

  if (list.status_override) {
    const { data: listStatuses } = await supabase
      .from("workspace_list_statuses")
      .select("*")
      .eq("list_id", listId)
      .order("position", { ascending: true });
    statuses = listStatuses ?? [];
  } else {
    const { data: folderStatuses } = await supabase
      .from("workspace_folder_statuses")
      .select("*")
      .eq("folder_id", list.folder_id)
      .order("position", { ascending: true });
    statuses = folderStatuses ?? [];
  }

  return { ...list, statuses };
}

/**
 * Update a list's name or description.
 */
export async function updateList(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const listId = formData.get("list_id") as string;
  if (!listId) return { error: "List ID required" };

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = listSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Need folder_id for revalidation
  const { data: list } = await supabase
    .from("workspace_lists")
    .select("folder_id")
    .eq("id", listId)
    .single();

  const { error } = await supabase
    .from("workspace_lists")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .eq("id", listId);

  if (error) return { error: "Failed to update list" };

  if (list) {
    revalidatePath(`/workspace/folders/${list.folder_id}`);
  }
  revalidatePath(`/workspace/folders`);
  return { success: true };
}

/**
 * Archive a list (soft delete).
 */
export async function archiveList(listId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: list } = await supabase
    .from("workspace_lists")
    .select("folder_id")
    .eq("id", listId)
    .single();

  const { error } = await supabase
    .from("workspace_lists")
    .update({ is_archived: true })
    .eq("id", listId);

  if (error) return { error: "Failed to archive list" };

  if (list) {
    revalidatePath(`/workspace/folders/${list.folder_id}`);
  }
  return { success: true };
}

/**
 * Create a list from a template.
 * Reads template_data (statuses + tasks), creates list with status_override, inserts list statuses and tasks.
 */
export async function createListFromTemplate(folderId: string, templateId: string) {
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

  const { data: template } = await supabase
    .from("workspace_list_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) return { error: "Template not found" };

  // Get next position
  const { data: existing } = await supabase
    .from("workspace_lists")
    .select("position")
    .eq("folder_id", folderId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templateData = template.template_data as any;

  const { data: list, error: insertError } = await supabase
    .from("workspace_lists")
    .insert({
      folder_id: folderId,
      company_id: profile.company_id,
      name: template.name,
      description: templateData.description ?? null,
      position: nextPosition,
      created_by: user.id,
      status_override: !!(templateData.statuses && templateData.statuses.length > 0),
    })
    .select("id")
    .single();

  if (insertError || !list) return { error: "Failed to create list from template" };

  // Insert list statuses if template has them
  if (templateData.statuses && templateData.statuses.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusInserts = templateData.statuses.map((s: any, i: number) => ({
      list_id: list.id,
      name: s.name,
      color: s.color,
      position: i,
      is_done: s.is_done ?? false,
      requires_approval: s.requires_approval ?? false,
    }));
    await supabase.from("workspace_list_statuses").insert(statusInserts);
  }

  // Insert tasks if template has them
  if (templateData.tasks && templateData.tasks.length > 0) {
    // Get status IDs for mapping
    const { data: createdStatuses } = await supabase
      .from("workspace_list_statuses")
      .select("id, name")
      .eq("list_id", list.id)
      .order("position", { ascending: true });

    const firstStatusId = createdStatuses?.[0]?.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskInserts = templateData.tasks.map((t: any, i: number) => ({
      list_id: list.id,
      company_id: profile.company_id,
      name: t.name,
      description: t.description ?? null,
      status_id: firstStatusId ?? "00000000-0000-0000-0000-000000000000",
      priority: t.priority ?? "none",
      position: i,
      created_by: user.id,
    }));
    await supabase.from("workspace_tasks").insert(taskInserts);
  }

  revalidatePath(`/workspace/folders/${folderId}`);
  return { success: true, listId: list.id };
}
