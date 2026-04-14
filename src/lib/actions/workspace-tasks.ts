"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema, remarkSchema } from "@/lib/validations/workspace";
import { sendNotification } from "@/lib/actions/notifications";

// ─── Tasks ───────────────────────────────────────────────────────────────────

/**
 * Create a task or subtask.
 * formData fields: list_id, name, description, assignee_id, start_date,
 *   target_end_date, priority, parent_task_id (optional)
 * Status defaults to first status (lowest position) in the list's applicable statuses.
 * Position = next in list. Notifies assignee on creation.
 */
export async function createTask(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, first_name, last_name")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const listId = formData.get("list_id") as string;
  if (!listId) return { error: "List ID required" };

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    assignee_id: (formData.get("assignee_id") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    target_end_date: (formData.get("target_end_date") as string) || null,
    priority:
      (formData.get("priority") as "urgent" | "high" | "medium" | "low" | "none") || "none",
  };

  const parsed = taskSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const parentTaskId = (formData.get("parent_task_id") as string) || null;

  // Determine first status for this list
  const { data: list } = await supabase
    .from("workspace_lists")
    .select("folder_id, status_override")
    .eq("id", listId)
    .single();

  if (!list) return { error: "List not found" };

  let firstStatusId: string | null = null;

  if (list.status_override) {
    const { data: listStatus } = await supabase
      .from("workspace_list_statuses")
      .select("id")
      .eq("list_id", listId)
      .order("position", { ascending: true })
      .limit(1)
      .single();
    firstStatusId = listStatus?.id ?? null;
  } else {
    const { data: folderStatus } = await supabase
      .from("workspace_folder_statuses")
      .select("id")
      .eq("folder_id", list.folder_id)
      .order("position", { ascending: true })
      .limit(1)
      .single();
    firstStatusId = folderStatus?.id ?? null;
  }

  if (!firstStatusId) return { error: "No statuses configured for this list" };

  // Get next position
  const { data: lastTask } = await supabase
    .from("workspace_tasks")
    .select("position")
    .eq("list_id", listId)
    .is("parent_task_id", null)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = lastTask ? lastTask.position + 1 : 0;

  const { data: task, error: insertError } = await supabase
    .from("workspace_tasks")
    .insert({
      list_id: listId,
      company_id: profile.company_id,
      parent_task_id: parentTaskId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status_id: firstStatusId,
      assignee_id: parsed.data.assignee_id ?? null,
      start_date: parsed.data.start_date ?? null,
      target_end_date: parsed.data.target_end_date ?? null,
      priority: parsed.data.priority,
      position: nextPosition,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !task) return { error: "Failed to create task" };

  // Notify assignee if different from creator
  if (parsed.data.assignee_id && parsed.data.assignee_id !== user.id) {
    const creatorName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Someone";
    await sendNotification({
      companyId: profile.company_id,
      recipientId: parsed.data.assignee_id,
      type: "task_created",
      title: "New task assigned to you",
      message: `${creatorName} assigned you to "${parsed.data.name}"`,
      link: `/workspace/tasks/${task.id}`,
    });
  }

  revalidatePath(`/workspace/folders`);
  return { success: true, taskId: task.id };
}

/**
 * Get tasks for a list with subtasks nested, ordered by position.
 * Optional filters: status_id, assignee_id, priority.
 * Includes subtask count and checklist progress.
 */
export async function getTasks(
  listId: string,
  filters?: {
    status_id?: string;
    assignee_id?: string;
    priority?: string;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("workspace_tasks")
    .select(
      `
      *,
      profiles:assignee_id(id, first_name, last_name, avatar_url),
      workspace_tasks!parent_task_id(id, name, status_id, priority, assignee_id),
      workspace_task_checklists(
        id,
        workspace_checklist_items(id, is_checked)
      )
    `
    )
    .eq("list_id", listId)
    .is("parent_task_id", null)
    .order("position", { ascending: true });

  if (filters?.status_id) query = query.eq("status_id", filters.status_id);
  if (filters?.assignee_id) query = query.eq("assignee_id", filters.assignee_id);
  if (filters?.priority)
    query = query.eq(
      "priority",
      filters.priority as "urgent" | "high" | "medium" | "low" | "none"
    );

  const { data } = await query;

  return data ?? [];
}

/**
 * Get a full task with subtasks, remarks (profile info), checklists (with items), and attachments.
 */
export async function getTask(taskId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("workspace_tasks")
    .select(
      `
      *,
      profiles:assignee_id(id, first_name, last_name, avatar_url),
      creator:created_by(id, first_name, last_name, avatar_url),
      workspace_tasks!parent_task_id(
        id, name, status_id, priority, assignee_id,
        profiles:assignee_id(id, first_name, last_name, avatar_url)
      ),
      workspace_task_remarks(
        *,
        profiles:profile_id(id, first_name, last_name, avatar_url)
      ),
      workspace_task_checklists(
        *,
        workspace_checklist_items(*)
      ),
      workspace_task_attachments(*)
    `
    )
    .eq("id", taskId)
    .single();

  return data ?? null;
}

/**
 * Get all tasks assigned to the current user across all lists.
 * Includes folder name and list name for context.
 */
export async function getMyTasks() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workspace_tasks")
    .select(
      `
      *,
      workspace_lists(
        id, name,
        workspace_folders(id, name, color, icon)
      )
    `
    )
    .eq("assignee_id", user.id)
    .order("target_end_date", { ascending: true, nullsFirst: false });

  return data ?? [];
}

/**
 * Update any task field.
 * If status_id changes, appends a system remark noting the status change.
 */
export async function updateTask(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const taskId = formData.get("task_id") as string;
  if (!taskId) return { error: "Task ID required" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  // Get current task state for comparison
  const { data: currentTask } = await supabase
    .from("workspace_tasks")
    .select("status_id, list_id")
    .eq("id", taskId)
    .single();

  if (!currentTask) return { error: "Task not found" };

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    assignee_id: (formData.get("assignee_id") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    target_end_date: (formData.get("target_end_date") as string) || null,
    priority:
      (formData.get("priority") as "urgent" | "high" | "medium" | "low" | "none") || "none",
  };

  const parsed = taskSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const newStatusId = (formData.get("status_id") as string) || currentTask.status_id;

  const { error } = await supabase
    .from("workspace_tasks")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      assignee_id: parsed.data.assignee_id ?? null,
      start_date: parsed.data.start_date ?? null,
      target_end_date: parsed.data.target_end_date ?? null,
      priority: parsed.data.priority,
      status_id: newStatusId,
    })
    .eq("id", taskId);

  if (error) return { error: "Failed to update task" };

  // If status changed, add a system remark
  if (newStatusId !== currentTask.status_id) {
    const { data: newStatus } = await supabase
      .from("workspace_folder_statuses")
      .select("name")
      .eq("id", newStatusId)
      .single();

    const statusName = newStatus?.name ?? "unknown";
    const userName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Someone";

    await supabase.from("workspace_task_remarks").insert({
      task_id: taskId,
      profile_id: user.id,
      content: `Status changed to "${statusName}" by ${userName}`,
    });
  }

  revalidatePath(`/workspace/tasks/${taskId}`);
  revalidatePath(`/workspace/folders`);
  return { success: true };
}

/**
 * Dedicated status change for kanban drag-and-drop.
 * Adds a system remark on change.
 */
export async function updateTaskStatus(taskId: string, statusId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  // Get new status name
  const { data: newStatus } = await supabase
    .from("workspace_folder_statuses")
    .select("name")
    .eq("id", statusId)
    .single();

  // Also try list statuses if not found in folder statuses
  let statusName = newStatus?.name;
  if (!statusName) {
    const { data: listStatus } = await supabase
      .from("workspace_list_statuses")
      .select("name")
      .eq("id", statusId)
      .single();
    statusName = listStatus?.name ?? "unknown";
  }

  const { error } = await supabase
    .from("workspace_tasks")
    .update({ status_id: statusId })
    .eq("id", taskId);

  if (error) return { error: "Failed to update task status" };

  const userName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Someone";

  await supabase.from("workspace_task_remarks").insert({
    task_id: taskId,
    profile_id: user.id,
    content: `Status changed to "${statusName}" by ${userName}`,
  });

  revalidatePath(`/workspace/tasks/${taskId}`);
  revalidatePath(`/workspace/folders`);
  return { success: true };
}

/**
 * Delete a task (and all cascading subtasks, remarks, attachments, checklists).
 */
export async function deleteTask(taskId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("workspace_tasks").delete().eq("id", taskId);

  if (error) return { error: "Failed to delete task" };

  revalidatePath("/workspace/folders");
  return { success: true };
}

/**
 * Reorder tasks in a list by updating their positions in bulk.
 */
export async function reorderTasks(listId: string, taskIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const updates = taskIds.map((id, index) =>
    supabase
      .from("workspace_tasks")
      .update({ position: index })
      .eq("id", id)
      .eq("list_id", listId)
  );

  await Promise.all(updates);

  revalidatePath("/workspace/folders");
  return { success: true };
}

// ─── Remarks ─────────────────────────────────────────────────────────────────

/**
 * Add a remark to a task.
 * formData fields: task_id, content
 */
export async function addRemark(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const taskId = formData.get("task_id") as string;
  if (!taskId) return { error: "Task ID required" };

  const rawData = { content: formData.get("content") as string };
  const parsed = remarkSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.from("workspace_task_remarks").insert({
    task_id: taskId,
    profile_id: user.id,
    content: parsed.data.content,
  });

  if (error) return { error: "Failed to add remark" };

  revalidatePath(`/workspace/tasks/${taskId}`);
  return { success: true };
}

/**
 * Get all remarks for a task with profile info, ordered by created_at asc.
 */
export async function getRemarks(taskId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workspace_task_remarks")
    .select(
      `
      *,
      profiles:profile_id(id, first_name, last_name, avatar_url)
    `
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

// ─── Attachments ─────────────────────────────────────────────────────────────

/**
 * Upload a file attachment for a task.
 * Stores in `{company_id}/workspace/{task_id}/{uuid}.{ext}` in Supabase Storage.
 */
export async function addAttachment(taskId: string, formData: FormData) {
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

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };

  const ext = file.name.split(".").pop();
  const fileId = crypto.randomUUID();
  const path = `${profile.company_id}/workspace/${taskId}/${fileId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("vizportal-storage")
    .upload(path, file);

  if (uploadError) return { error: "Failed to upload file" };

  const { data: urlData } = supabase.storage.from("vizportal-storage").getPublicUrl(path);

  const { error: recordError } = await supabase.from("workspace_task_attachments").insert({
    task_id: taskId,
    file_url: urlData.publicUrl,
    file_name: file.name,
    uploaded_by: user.id,
  });

  if (recordError) return { error: "Failed to save attachment record" };

  revalidatePath(`/workspace/tasks/${taskId}`);
  return { success: true };
}

/**
 * Delete a task attachment record.
 * Storage cleanup is optional (record-only deletion for now).
 */
export async function deleteAttachment(attachmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: attachment } = await supabase
    .from("workspace_task_attachments")
    .select("task_id")
    .eq("id", attachmentId)
    .single();

  const { error } = await supabase
    .from("workspace_task_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) return { error: "Failed to delete attachment" };

  if (attachment) {
    revalidatePath(`/workspace/tasks/${attachment.task_id}`);
  }
  return { success: true };
}

// ─── Checklists ───────────────────────────────────────────────────────────────

/**
 * Create an empty checklist on a task.
 */
export async function addChecklist(taskId: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get next position
  const { data: existing } = await supabase
    .from("workspace_task_checklists")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  const { error } = await supabase.from("workspace_task_checklists").insert({
    task_id: taskId,
    name,
    position: nextPosition,
  });

  if (error) return { error: "Failed to add checklist" };

  revalidatePath(`/workspace/tasks/${taskId}`);
  return { success: true };
}

/**
 * Create a checklist from a template, including all template items.
 */
export async function addChecklistFromTemplate(taskId: string, templateId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: template } = await supabase
    .from("workspace_checklist_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) return { error: "Template not found" };

  // Get next checklist position
  const { data: existing } = await supabase
    .from("workspace_task_checklists")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  const { data: checklist, error: checklistError } = await supabase
    .from("workspace_task_checklists")
    .insert({
      task_id: taskId,
      name: template.name,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (checklistError || !checklist) return { error: "Failed to create checklist" };

  // Insert template items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templateItems = template.items as any[];
  if (templateItems && templateItems.length > 0) {
    const itemInserts = templateItems.map((item: { name: string }, i: number) => ({
      checklist_id: checklist.id,
      name: item.name,
      is_checked: false,
      position: i,
    }));
    await supabase.from("workspace_checklist_items").insert(itemInserts);
  }

  revalidatePath(`/workspace/tasks/${taskId}`);
  return { success: true };
}

/**
 * Rename a checklist.
 */
export async function updateChecklist(checklistId: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: checklist } = await supabase
    .from("workspace_task_checklists")
    .select("task_id")
    .eq("id", checklistId)
    .single();

  const { error } = await supabase
    .from("workspace_task_checklists")
    .update({ name })
    .eq("id", checklistId);

  if (error) return { error: "Failed to update checklist" };

  if (checklist) {
    revalidatePath(`/workspace/tasks/${checklist.task_id}`);
  }
  return { success: true };
}

/**
 * Delete a checklist and all its items.
 */
export async function deleteChecklist(checklistId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: checklist } = await supabase
    .from("workspace_task_checklists")
    .select("task_id")
    .eq("id", checklistId)
    .single();

  const { error } = await supabase
    .from("workspace_task_checklists")
    .delete()
    .eq("id", checklistId);

  if (error) return { error: "Failed to delete checklist" };

  if (checklist) {
    revalidatePath(`/workspace/tasks/${checklist.task_id}`);
  }
  return { success: true };
}

/**
 * Add an item to a checklist.
 */
export async function addChecklistItem(checklistId: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get next position
  const { data: existing } = await supabase
    .from("workspace_checklist_items")
    .select("position")
    .eq("checklist_id", checklistId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  const { error } = await supabase.from("workspace_checklist_items").insert({
    checklist_id: checklistId,
    name,
    is_checked: false,
    position: nextPosition,
  });

  if (error) return { error: "Failed to add checklist item" };

  // Revalidate — get task_id via checklist
  const { data: checklist } = await supabase
    .from("workspace_task_checklists")
    .select("task_id")
    .eq("id", checklistId)
    .single();

  if (checklist) {
    revalidatePath(`/workspace/tasks/${checklist.task_id}`);
  }
  return { success: true };
}

/**
 * Toggle a checklist item's checked state.
 */
export async function toggleChecklistItem(itemId: string, isChecked: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspace_checklist_items")
    .update({ is_checked: isChecked })
    .eq("id", itemId);

  if (error) return { error: "Failed to update checklist item" };

  // Revalidate — traverse to task_id
  const { data: item } = await supabase
    .from("workspace_checklist_items")
    .select("checklist_id, workspace_task_checklists(task_id)")
    .eq("id", itemId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskId = (item?.workspace_task_checklists as any)?.task_id;
  if (taskId) {
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return { success: true };
}

/**
 * Delete a checklist item.
 */
export async function deleteChecklistItem(itemId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get task_id before deleting
  const { data: item } = await supabase
    .from("workspace_checklist_items")
    .select("checklist_id, workspace_task_checklists(task_id)")
    .eq("id", itemId)
    .single();

  const { error } = await supabase
    .from("workspace_checklist_items")
    .delete()
    .eq("id", itemId);

  if (error) return { error: "Failed to delete checklist item" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskId = (item?.workspace_task_checklists as any)?.task_id;
  if (taskId) {
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return { success: true };
}
