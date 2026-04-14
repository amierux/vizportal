"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { folderSchema, statusSchema } from "@/lib/validations/workspace";

const DEFAULT_STATUSES = [
  { name: "To Do", color: "#94a3b8", is_done: false, requires_approval: false },
  { name: "In Progress", color: "#3b82f6", is_done: false, requires_approval: false },
  { name: "Review", color: "#f59e0b", is_done: false, requires_approval: false },
  { name: "Done", color: "#22c55e", is_done: true, requires_approval: false },
];

/**
 * Create a new workspace folder.
 * Adds creator as admin member and seeds 4 default statuses.
 */
export async function createFolder(_prevState: unknown, formData: FormData) {
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
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    color: (formData.get("color") as string) || "#6366f1",
    icon: (formData.get("icon") as string) || "📁",
  };

  const parsed = folderSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: folder, error: insertError } = await supabase
    .from("workspace_folders")
    .insert({
      company_id: profile.company_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color,
      icon: parsed.data.icon,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !folder) return { error: "Failed to create folder" };

  // Add creator as admin member
  await supabase.from("workspace_folder_members").insert({
    folder_id: folder.id,
    profile_id: user.id,
    permission: "admin",
  });

  // Seed default statuses
  const statusInserts = DEFAULT_STATUSES.map((s, i) => ({
    folder_id: folder.id,
    name: s.name,
    color: s.color,
    position: i,
    is_done: s.is_done,
    requires_approval: s.requires_approval,
  }));
  await supabase.from("workspace_folder_statuses").insert(statusInserts);

  revalidatePath("/workspace/folders");
  return { success: true, folderId: folder.id };
}

/**
 * Get all folders the current user is a member of (admins see all).
 * Includes member count and list count.
 */
export async function getFolders() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workspace_folders")
    .select(
      `
      *,
      workspace_folder_members(count),
      workspace_lists(count)
    `
    )
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get a single folder with members (profiles joined) and statuses (ordered by position).
 */
export async function getFolder(folderId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("workspace_folders")
    .select(
      `
      *,
      workspace_folder_members(
        *,
        profiles:profile_id(id, first_name, last_name, avatar_url, email)
      ),
      workspace_folder_statuses(*)
    `
    )
    .eq("id", folderId)
    .single();

  if (!data) return null;

  // Sort statuses by position
  if (Array.isArray(data.workspace_folder_statuses)) {
    data.workspace_folder_statuses.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
  }

  return data;
}

/**
 * Update a folder's name, description, color, or icon.
 */
export async function updateFolder(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const folderId = formData.get("folder_id") as string;
  if (!folderId) return { error: "Folder ID required" };

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    color: (formData.get("color") as string) || "#6366f1",
    icon: (formData.get("icon") as string) || "📁",
  };

  const parsed = folderSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("workspace_folders")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color,
      icon: parsed.data.icon,
    })
    .eq("id", folderId);

  if (error) return { error: "Failed to update folder" };

  revalidatePath(`/workspace/folders/${folderId}`);
  revalidatePath("/workspace/folders");
  return { success: true };
}

/**
 * Archive a folder (soft delete).
 */
export async function archiveFolder(folderId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspace_folders")
    .update({ is_archived: true })
    .eq("id", folderId);

  if (error) return { error: "Failed to archive folder" };

  revalidatePath("/workspace/folders");
  return { success: true };
}

/**
 * Add a member to a folder with a given permission level.
 */
export async function addFolderMember(
  folderId: string,
  profileId: string,
  permission: "viewer" | "creator" | "editor" | "admin"
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("workspace_folder_members").insert({
    folder_id: folderId,
    profile_id: profileId,
    permission,
  });

  if (error) return { error: "Failed to add member" };

  revalidatePath(`/workspace/folders/${folderId}`);
  return { success: true };
}

/**
 * Remove a member from a folder.
 */
export async function removeFolderMember(folderId: string, profileId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspace_folder_members")
    .delete()
    .eq("folder_id", folderId)
    .eq("profile_id", profileId);

  if (error) return { error: "Failed to remove member" };

  revalidatePath(`/workspace/folders/${folderId}`);
  return { success: true };
}

/**
 * Update a folder member's permission level.
 */
export async function updateFolderMemberPermission(
  folderId: string,
  profileId: string,
  permission: "viewer" | "creator" | "editor" | "admin"
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspace_folder_members")
    .update({ permission })
    .eq("folder_id", folderId)
    .eq("profile_id", profileId);

  if (error) return { error: "Failed to update member permission" };

  revalidatePath(`/workspace/folders/${folderId}`);
  return { success: true };
}

/**
 * Add a custom status to a folder.
 */
export async function addFolderStatus(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const folderId = formData.get("folder_id") as string;
  if (!folderId) return { error: "Folder ID required" };

  const rawData = {
    name: formData.get("name") as string,
    color: formData.get("color") as string,
    is_done: formData.get("is_done") === "true",
    requires_approval: formData.get("requires_approval") === "true",
  };

  const parsed = statusSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Get next position
  const { data: existing } = await supabase
    .from("workspace_folder_statuses")
    .select("position")
    .eq("folder_id", folderId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  const { error } = await supabase.from("workspace_folder_statuses").insert({
    folder_id: folderId,
    name: parsed.data.name,
    color: parsed.data.color,
    position: nextPosition,
    is_done: parsed.data.is_done,
    requires_approval: parsed.data.requires_approval,
  });

  if (error) return { error: "Failed to add status" };

  revalidatePath(`/workspace/folders/${folderId}`);
  return { success: true };
}

/**
 * Update a folder status's name, color, is_done, or requires_approval.
 */
export async function updateFolderStatus(
  statusId: string,
  data: {
    name?: string;
    color?: string;
    is_done?: boolean;
    requires_approval?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspace_folder_statuses")
    .update(data)
    .eq("id", statusId);

  if (error) return { error: "Failed to update status" };

  revalidatePath("/workspace");
  return { success: true };
}

/**
 * Delete a folder status.
 * Fails if any tasks are using this status.
 */
export async function deleteFolderStatus(statusId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if any tasks use this status
  const { count } = await supabase
    .from("workspace_tasks")
    .select("*", { count: "exact", head: true })
    .eq("status_id", statusId);

  if (count && count > 0) {
    return { error: `Cannot delete status — ${count} task(s) are using it. Move them first.` };
  }

  const { error } = await supabase
    .from("workspace_folder_statuses")
    .delete()
    .eq("id", statusId);

  if (error) return { error: "Failed to delete status" };

  revalidatePath("/workspace");
  return { success: true };
}

/**
 * Reorder folder statuses by updating their positions in bulk.
 */
export async function reorderFolderStatuses(folderId: string, statusIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const updates = statusIds.map((id, index) =>
    supabase
      .from("workspace_folder_statuses")
      .update({ position: index })
      .eq("id", id)
      .eq("folder_id", folderId)
  );

  await Promise.all(updates);

  revalidatePath(`/workspace/folders/${folderId}`);
  return { success: true };
}
