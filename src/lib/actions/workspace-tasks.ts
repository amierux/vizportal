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

  const listId = formData.get("list_id") as string;
  if (!listId) return { error: "List ID required" };

  const [{ data: profile }, { data: list }] = await Promise.all([
    supabase
      .from("profiles")
      .select("company_id, first_name, last_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("workspace_lists")
      .select("folder_id, status_override")
      .eq("id", listId)
      .single(),
  ]);

  if (!profile) return { error: "Profile not found" };
  if (!list) return { error: "List not found" };

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
      ),
      workspace_task_remarks(id, content, created_at, profile_id)
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
 * Checks requires_approval; if set, creates approval record instead of changing status.
 * On approval to a done status, triggers recurring task creation.
 */
export async function updateTaskStatus(taskId: string, statusId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [{ data: profile }, { data: folderStatus }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("workspace_folder_statuses")
      .select("name, requires_approval, is_done")
      .eq("id", statusId)
      .single(),
  ]);

  const userName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Someone";

  // Resolve status name + approval config (folder or list statuses)
  let statusName: string | undefined;
  let requiresApproval = false;
  let isDone = false;

  if (folderStatus) {
    statusName = folderStatus.name;
    requiresApproval = folderStatus.requires_approval ?? false;
    isDone = folderStatus.is_done ?? false;
  } else {
    const { data: listStatus } = await supabase
      .from("workspace_list_statuses")
      .select("name, requires_approval, is_done")
      .eq("id", statusId)
      .single();
    statusName = listStatus?.name ?? "unknown";
    requiresApproval = listStatus?.requires_approval ?? false;
    isDone = listStatus?.is_done ?? false;
  }

  // Check for approval requirement
  if (requiresApproval) {
    const { data: approverConfig } = await supabase
      .from("workspace_status_approvers")
      .select("id, approval_mode")
      .eq("status_id", statusId)
      .single();

    if (approverConfig) {
      const { data: approverList } = await supabase
        .from("workspace_status_approver_list")
        .select("id, profile_id, step_order")
        .eq("status_approver_id", approverConfig.id)
        .order("step_order", { ascending: true });

      // Get current task status for from_status_id
      const { data: currentTask } = await supabase
        .from("workspace_tasks")
        .select("status_id")
        .eq("id", taskId)
        .single();

      // Create approval record
      const { data: approval, error: approvalError } = await supabase
        .from("workspace_task_approvals")
        .insert({
          task_id: taskId,
          from_status_id: currentTask?.status_id ?? statusId,
          to_status_id: statusId,
          requested_by: user.id,
          status: "pending",
        })
        .select("id")
        .single();

      if (approvalError || !approval) return { error: "Failed to create approval request" };

      // Create approval steps
      if (approverList && approverList.length > 0) {
        const steps = approverList.map((a) => ({
          task_approval_id: approval.id,
          approver_id: a.profile_id,
          step_order: a.step_order,
          status: "pending" as const,
        }));
        await supabase.from("workspace_task_approval_steps").insert(steps);

        // Notify first approver (hierarchical) or all (any_one)
        const toNotify =
          approverConfig.approval_mode === "hierarchical"
            ? [approverList[0]]
            : approverList;

        for (const approver of toNotify) {
          await sendNotification({
            companyId: (await supabase.from("workspace_tasks").select("company_id").eq("id", taskId).single()).data?.company_id ?? "",
            recipientId: approver.profile_id,
            type: "task_status_approval",
            title: "Approval requested",
            message: `${userName} requested status change to "${statusName}" on a task`,
            link: `/workspace/tasks/${taskId}`,
          });
        }
      }

      // Add remark about pending approval
      await supabase.from("workspace_task_remarks").insert({
        task_id: taskId,
        profile_id: user.id,
        content: `Status change to "${statusName}" requested by ${userName} — pending approval`,
      });

      revalidatePath(`/workspace/tasks/${taskId}`);
      revalidatePath(`/workspace/folders`);
      return { success: true, pendingApproval: true };
    }
  }

  // No approval needed — change status directly
  const { error } = await supabase
    .from("workspace_tasks")
    .update({ status_id: statusId })
    .eq("id", taskId);

  if (error) return { error: "Failed to update task status" };

  await supabase.from("workspace_task_remarks").insert({
    task_id: taskId,
    profile_id: user.id,
    content: `Status changed to "${statusName}" by ${userName}`,
  });

  // Handle recurring task on done status
  if (isDone) {
    await handleRecurringTaskCompletion(taskId);
  }

  revalidatePath(`/workspace/tasks/${taskId}`);
  revalidatePath(`/workspace/folders`);
  return { success: true };
}

/**
 * Process an approval step (approve or reject).
 * Hierarchical: advance to next step; all approved = change status.
 * Any_one: one approval = change status.
 * Rejection: mark approval rejected, add remark.
 */
export async function processTaskApproval(
  stepId: string,
  decision: "approved" | "rejected",
  comment: string | null
) {
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

  const userName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Someone";

  // Get the step
  const { data: step } = await supabase
    .from("workspace_task_approval_steps")
    .select("*, workspace_task_approvals(id, task_id, to_status_id, status, workspace_task_approval_steps(id, step_order, status, approver_id))")
    .eq("id", stepId)
    .single();

  if (!step) return { error: "Step not found" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approval = (step as any).workspace_task_approvals;
  if (!approval) return { error: "Approval not found" };
  if (approval.status !== "pending") return { error: "Approval already resolved" };

  // Update step
  await supabase
    .from("workspace_task_approval_steps")
    .update({ status: decision, comment, decided_at: new Date().toISOString() })
    .eq("id", stepId);

  const taskId = approval.task_id;
  const toStatusId = approval.to_status_id;

  if (decision === "rejected") {
    // Mark approval as rejected
    await supabase
      .from("workspace_task_approvals")
      .update({ status: "rejected" })
      .eq("id", approval.id);

    await supabase.from("workspace_task_remarks").insert({
      task_id: taskId,
      profile_id: user.id,
      content: `Status change rejected by ${userName}${comment ? `: ${comment}` : ""}`,
    });

    revalidatePath(`/workspace/tasks/${taskId}`);
    revalidatePath(`/workspace/folders`);
    return { success: true };
  }

  // Approved — check mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSteps = (approval.workspace_task_approval_steps as any[]) ?? [];
  const remainingSteps = allSteps.filter(
    (s: { id: string; status: string }) => s.id !== stepId && s.status === "pending"
  );

  // Get approval config mode
  const { data: statusApprover } = await supabase
    .from("workspace_status_approvers")
    .select("approval_mode")
    .eq("status_id", toStatusId)
    .single();

  const mode = statusApprover?.approval_mode ?? "hierarchical";

  let shouldApprove = false;

  if (mode === "any_one") {
    shouldApprove = true;
    // Mark remaining steps as approved too
    if (remainingSteps.length > 0) {
      await supabase
        .from("workspace_task_approval_steps")
        .update({ status: "approved", decided_at: new Date().toISOString() })
        .in("id", remainingSteps.map((s: { id: string }) => s.id));
    }
  } else {
    // Hierarchical — notify next step if exists
    const currentStepOrder = step.step_order;
    const nextStep = allSteps.find(
      (s: { step_order: number; status: string }) =>
        s.step_order > currentStepOrder && s.status === "pending"
    );

    if (nextStep) {
      // Notify next approver
      const { data: task } = await supabase
        .from("workspace_tasks")
        .select("company_id")
        .eq("id", taskId)
        .single();

      if (task) {
        await sendNotification({
          companyId: task.company_id,
          recipientId: nextStep.approver_id,
          type: "task_status_approval",
          title: "Approval needed",
          message: `${userName} approved a step — your approval is now required`,
          link: `/workspace/tasks/${taskId}`,
        });
      }
    } else {
      // All steps approved
      shouldApprove = true;
    }
  }

  if (shouldApprove) {
    // Mark approval as approved
    await supabase
      .from("workspace_task_approvals")
      .update({ status: "approved" })
      .eq("id", approval.id);

    // Change task status
    await supabase
      .from("workspace_tasks")
      .update({ status_id: toStatusId })
      .eq("id", taskId);

    // Check if this status is done → recurring
    const { data: fs } = await supabase
      .from("workspace_folder_statuses")
      .select("is_done")
      .eq("id", toStatusId)
      .single();
    const isDone = fs?.is_done ?? false;
    if (!isDone) {
      const { data: ls } = await supabase
        .from("workspace_list_statuses")
        .select("is_done")
        .eq("id", toStatusId)
        .single();
      if (ls?.is_done) await handleRecurringTaskCompletion(taskId);
    } else {
      await handleRecurringTaskCompletion(taskId);
    }

    // Get status name
    let approvedStatusName = "unknown";
    const { data: fsName } = await supabase
      .from("workspace_folder_statuses")
      .select("name")
      .eq("id", toStatusId)
      .single();
    if (fsName) approvedStatusName = fsName.name;
    else {
      const { data: lsName } = await supabase
        .from("workspace_list_statuses")
        .select("name")
        .eq("id", toStatusId)
        .single();
      if (lsName) approvedStatusName = lsName.name;
    }

    await supabase.from("workspace_task_remarks").insert({
      task_id: taskId,
      profile_id: user.id,
      content: `Status change to "${approvedStatusName}" approved by ${userName}${comment ? ` — ${comment}` : ""}`,
    });
  }

  revalidatePath(`/workspace/tasks/${taskId}`);
  revalidatePath(`/workspace/folders`);
  return { success: true };
}

/**
 * Get pending approval records for a task (for UI display).
 */
export async function getPendingTaskApprovals(taskId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workspace_task_approvals")
    .select(`
      *,
      requested_by_profile:requested_by(first_name, last_name),
      workspace_task_approval_steps(
        id, step_order, status, comment, decided_at,
        approver:approver_id(id, first_name, last_name)
      )
    `)
    .eq("task_id", taskId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// ─── Recurring Tasks ──────────────────────────────────────────────────────────

function shiftDate(dateStr: string, interval: string, every: number): string {
  const d = new Date(dateStr);
  switch (interval) {
    case "daily": d.setDate(d.getDate() + every); break;
    case "weekly": d.setDate(d.getDate() + (every * 7)); break;
    case "monthly": d.setMonth(d.getMonth() + every); break;
    default: d.setDate(d.getDate() + every); break;
  }
  return d.toISOString().split("T")[0];
}

/**
 * When a recurring task is marked done, create the next occurrence.
 * Copies checklists/subtasks based on recurrence_rule carry-over flags.
 */
export async function handleRecurringTaskCompletion(taskId: string) {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("workspace_tasks")
    .select(`
      *,
      workspace_task_checklists(
        id, name, position,
        workspace_checklist_items(id, name, is_checked, position)
      ),
      workspace_tasks!parent_task_id(id, name, status_id, assignee_id, priority, description, start_date, target_end_date)
    `)
    .eq("id", taskId)
    .single();

  if (!task) return;
  if (!task.is_recurring || !task.recurrence_rule) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rule = task.recurrence_rule as any;
  const interval: string = rule.interval ?? "weekly";
  const every: number = rule.every ?? 1;
  const carryChecklist: boolean = rule.carry_over_checklist ?? false;
  const carrySubtasks: boolean = rule.carry_over_subtasks ?? false;

  // Find first non-done status in the list
  const { data: list } = await supabase
    .from("workspace_lists")
    .select("folder_id, status_override")
    .eq("id", task.list_id)
    .single();

  if (!list) return;

  let firstStatusId: string | null = null;
  if (list.status_override) {
    const { data: ls } = await supabase
      .from("workspace_list_statuses")
      .select("id")
      .eq("list_id", task.list_id)
      .eq("is_done", false)
      .order("position", { ascending: true })
      .limit(1)
      .single();
    firstStatusId = ls?.id ?? null;
  } else {
    const { data: fs } = await supabase
      .from("workspace_folder_statuses")
      .select("id")
      .eq("folder_id", list.folder_id)
      .eq("is_done", false)
      .order("position", { ascending: true })
      .limit(1)
      .single();
    firstStatusId = fs?.id ?? null;
  }

  if (!firstStatusId) return;

  // Compute new dates
  const newStartDate = task.start_date ? shiftDate(task.start_date, interval, every) : null;
  const newEndDate = task.target_end_date ? shiftDate(task.target_end_date, interval, every) : null;

  // Get next position
  const { data: lastTask } = await supabase
    .from("workspace_tasks")
    .select("position")
    .eq("list_id", task.list_id)
    .is("parent_task_id", null)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = lastTask ? lastTask.position + 1 : 0;

  const { data: newTask, error: taskError } = await supabase
    .from("workspace_tasks")
    .insert({
      list_id: task.list_id,
      company_id: task.company_id,
      name: task.name,
      description: task.description,
      assignee_id: task.assignee_id,
      priority: task.priority,
      status_id: firstStatusId,
      start_date: newStartDate,
      target_end_date: newEndDate,
      position: nextPosition,
      created_by: task.created_by,
      is_recurring: true,
      recurrence_rule: task.recurrence_rule,
    })
    .select("id")
    .single();

  if (taskError || !newTask) return;

  // Carry over unchecked checklist items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checklists: any[] = (task as any).workspace_task_checklists ?? [];
  if (carryChecklist && checklists.length) {
    for (const checklist of checklists) {
      const { data: newChecklist } = await supabase
        .from("workspace_task_checklists")
        .insert({ task_id: newTask.id, name: checklist.name, position: checklist.position })
        .select("id")
        .single();

      if (newChecklist) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uncheckedItems = (checklist.workspace_checklist_items as any[]).filter((i: any) => !i.is_checked);
        if (uncheckedItems.length > 0) {
          await supabase.from("workspace_checklist_items").insert(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            uncheckedItems.map((item: any) => ({
              checklist_id: newChecklist.id,
              name: item.name,
              is_checked: false,
              position: item.position,
            }))
          );
        }
      }
    }
  }

  // Carry over incomplete subtasks
  if (carrySubtasks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtasks = (task as any).workspace_tasks ?? [];
    // Copy all subtasks — filtering by is_done would require extra queries per subtask
    const incompleteSubtasks = subtasks;

    if (incompleteSubtasks.length > 0) {
      await supabase.from("workspace_tasks").insert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        incompleteSubtasks.map((sub: any, i: number) => ({
          list_id: task.list_id,
          company_id: task.company_id,
          parent_task_id: newTask.id,
          name: sub.name,
          description: sub.description ?? null,
          assignee_id: sub.assignee_id,
          priority: sub.priority,
          status_id: firstStatusId,
          position: i,
          created_by: task.created_by,
        }))
      );
    }
  }

  return newTask.id;
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
 * Add a remark via direct args (for inline list view).
 */
export async function addTaskRemark(taskId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Empty remark" };

  const { error } = await supabase.from("workspace_task_remarks").insert({
    task_id: taskId,
    profile_id: user.id,
    content: content.trim(),
  });
  if (error) return { error: "Failed to add remark" };
  revalidatePath("/workspace");
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

/**
 * Update a single field on a task. Designed for inline editing in list view.
 */
export async function updateTaskField(
  taskId: string,
  field: "name" | "assignee_id" | "priority" | "start_date" | "target_end_date",
  value: string | null
) {
  const supabase = await createClient();
  // Build a typed update payload accepted by Supabase's strict types
  type TaskUpdate = {
    name?: string | null;
    assignee_id?: string | null;
    priority?: string | null;
    start_date?: string | null;
    target_end_date?: string | null;
  };
  const updateData: TaskUpdate = {};
  if (field === "name") updateData.name = value;
  else if (field === "assignee_id") updateData.assignee_id = value;
  else if (field === "priority") updateData.priority = value;
  else if (field === "start_date") updateData.start_date = value;
  else if (field === "target_end_date") updateData.target_end_date = value;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("workspace_tasks").update(updateData as any).eq("id", taskId);
  if (error) return { error: "Failed to update" };
  revalidatePath("/workspace");
  return { success: true };
}
