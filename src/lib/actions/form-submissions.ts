"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatFullName } from "@/lib/utils/format";
import { sendNotification } from "@/lib/actions/notifications";

// ─── Submit ───────────────────────────────────────────────────────────────────

/**
 * Submit a form response.
 *
 * data is a Record<string, unknown> mapping field_id → value.
 * File uploads should be done separately via uploadFormFile first;
 * include the returned URLs in data before calling this action.
 *
 * If the current user is authenticated, sets submitted_by and marks
 * any pending assignment as completed.
 *
 * If save_to_list_enabled, creates a workspace_task in the target list.
 * If approval_enabled, attempts to trigger an approval chain.
 */
export async function submitForm(
  formId: string,
  data: Record<string, unknown>,
  respondentName?: string,
  respondentEmail?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the form for settings + company
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: form } = await (supabase as any)
    .from("forms")
    .select("id, name, company_id, save_to_list_enabled, target_list_id, approval_enabled")
    .eq("id", formId)
    .single();

  if (!form) return { error: "Form not found" };

  // Resolve submitter name for task name
  let submitterName = respondentName ?? "Anonymous";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();
    if (profile) {
      submitterName = formatFullName(profile.first_name, profile.last_name);
    }
  }

  // Create submission
  const { data: submission, error: subError } = await supabase
    .from("form_submissions")
    .insert({
      form_id: formId,
      company_id: form.company_id,
      submitted_by: user?.id ?? null,
      respondent_name: respondentName ?? null,
      respondent_email: respondentEmail ?? null,
      status: "submitted",
      data,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (subError || !submission) return { error: "Failed to submit form" };

  const submissionId = submission.id;

  // Mark assignment completed if user has one
  if (user) {
    await supabase
      .from("form_assignments")
      .update({ completed: true })
      .eq("form_id", formId)
      .eq("profile_id", user.id)
      .eq("completed", false);
  }

  // Save to workspace list if enabled
  let workspaceTaskId: string | null = null;

  if (form.save_to_list_enabled && form.target_list_id) {
    try {
      // Determine default status for the list
      const { data: list } = await supabase
        .from("workspace_lists")
        .select("folder_id, status_override")
        .eq("id", form.target_list_id)
        .single();

      let firstStatusId: string | null = null;

      if (list) {
        if (list.status_override) {
          const { data: listStatus } = await supabase
            .from("workspace_list_statuses")
            .select("id")
            .eq("list_id", form.target_list_id)
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
      }

      // Build description from submitted data
      const description = Object.entries(data)
        .map(([key, value]) => `**${key}:** ${String(value ?? "")}`)
        .join("\n");

      // Get next task position in list
      const { data: lastTask } = await supabase
        .from("workspace_tasks")
        .select("position")
        .eq("list_id", form.target_list_id)
        .is("parent_task_id", null)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const nextPosition = lastTask ? lastTask.position + 1 : 0;

      const { data: task } = await supabase
        .from("workspace_tasks")
        .insert({
          list_id: form.target_list_id,
          company_id: form.company_id,
          name: `${form.name} - ${submitterName}`,
          description,
          status_id: firstStatusId,
          created_by: user?.id ?? null,
          position: nextPosition,
        })
        .select("id")
        .single();

      if (task) {
        workspaceTaskId = task.id;

        // Update submission with workspace task reference
        await supabase
          .from("form_submissions")
          .update({ saved_to_list: true, workspace_task_id: task.id })
          .eq("id", submissionId);
      }
    } catch (err) {
      // Non-fatal: log but continue
      console.error("Failed to create workspace task for form submission:", err);
    }
  }

  // Trigger approval chain if enabled
  if (form.approval_enabled && user) {
    try {
      const { createApprovalRequest } = await import("@/lib/actions/approvals");
      await createApprovalRequest({
        companyId: form.company_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: "form_submission" as any,
        referenceId: submissionId,
        requesterId: user.id,
        details: `Form submission: ${form.name} by ${submitterName}`,
      });
    } catch (err) {
      // Approval type may not be supported — skip silently
      console.warn("Form approval chain skipped:", err);
    }
  }

  revalidatePath(`/forms/${formId}/submissions`);
  revalidatePath("/forms/my-forms");

  return { success: true, submissionId, workspaceTaskId };
}

// ─── File Upload ──────────────────────────────────────────────────────────────

/**
 * Upload a file attachment for a form submission.
 * Stores at: {company_id}/forms/{form_id}/{submission_id}/{uuid}.{ext}
 * Returns the public URL.
 */
export async function uploadFormFile(formId: string, submissionId: string, file: File) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Allow unauthenticated uploads for public forms; file param validates implicitly

  // Get company_id from form
  const { data: form } = await supabase
    .from("forms")
    .select("company_id")
    .eq("id", formId)
    .single();

  if (!form) return { error: "Form not found" };

  const ext = file.name.split(".").pop();
  const path = `${form.company_id}/forms/${formId}/${submissionId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("vizportal-storage").upload(path, file);

  if (error) return { error: "Failed to upload file" };

  const { data: publicUrlData } = supabase.storage
    .from("vizportal-storage")
    .getPublicUrl(path);

  return { success: true, url: publicUrlData.publicUrl, path };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get all submissions for a form (admin view) with submitter profile data.
 */
export async function getFormSubmissions(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("form_submissions")
    .select(
      `
      *,
      submitter:profiles!form_submissions_submitted_by_fkey(id, first_name, last_name, email, avatar_url)
    `
    )
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });

  return data ?? [];
}

/**
 * Get a single submission with the form definition and submitted data.
 */
export async function getSubmission(submissionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("form_submissions")
    .select(
      `
      *,
      submitter:profiles!form_submissions_submitted_by_fkey(id, first_name, last_name, email),
      forms:form_id(
        id, name, description,
        form_sections(
          *,
          form_fields(*)
        )
      )
    `
    )
    .eq("id", submissionId)
    .single();

  if (!data) return null;

  // Sort sections and fields by position within the nested form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = data.forms as any;
  if (form?.form_sections && Array.isArray(form.form_sections)) {
    form.form_sections.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
    for (const section of form.form_sections) {
      if (Array.isArray(section.form_fields)) {
        section.form_fields.sort(
          (a: { position: number }, b: { position: number }) => a.position - b.position
        );
      }
    }
  }

  return data;
}

/**
 * Get the current user's own form submissions.
 */
export async function getMyFormSubmissions() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("form_submissions")
    .select(
      `
      *,
      forms:form_id(id, name, description)
    `
    )
    .eq("submitted_by", user.id)
    .order("submitted_at", { ascending: false });

  return data ?? [];
}

// ─── Approve / Reject ─────────────────────────────────────────────────────────

/**
 * Approve a submission. Updates status and optionally updates the linked workspace task.
 * Sends notification to submitter.
 */
export async function approveSubmission(submissionId: string, comment?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the submission with form settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submission } = await (supabase as any)
    .from("form_submissions")
    .select(
      `
      *,
      forms:form_id(id, name, save_to_list_enabled, company_id)
    `
    )
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Submission not found" };

  const { error: updateError } = await supabase
    .from("form_submissions")
    .update({ status: "approved" })
    .eq("id", submissionId);

  if (updateError) return { error: "Failed to approve submission" };

  // Update linked workspace task status if applicable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = submission.forms as any;

  if (form?.save_to_list_enabled && submission.workspace_task_id) {
    try {
      // Find a "done" status for the task's list — get via the task itself
      const { data: task } = await supabase
        .from("workspace_tasks")
        .select("list_id")
        .eq("id", submission.workspace_task_id)
        .single();

      if (task) {
        const { data: list } = await supabase
          .from("workspace_lists")
          .select("folder_id, status_override")
          .eq("id", task.list_id)
          .single();

        let doneStatusId: string | null = null;

        if (list) {
          if (list.status_override) {
            const { data: s } = await supabase
              .from("workspace_list_statuses")
              .select("id")
              .eq("list_id", task.list_id)
              .eq("is_done", true)
              .order("position", { ascending: true })
              .limit(1)
              .single();
            doneStatusId = s?.id ?? null;
          } else {
            const { data: s } = await supabase
              .from("workspace_folder_statuses")
              .select("id")
              .eq("folder_id", list.folder_id)
              .eq("is_done", true)
              .order("position", { ascending: true })
              .limit(1)
              .single();
            doneStatusId = s?.id ?? null;
          }
        }

        if (doneStatusId) {
          await supabase
            .from("workspace_tasks")
            .update({ status_id: doneStatusId })
            .eq("id", submission.workspace_task_id);
        }
      }
    } catch (err) {
      console.error("Failed to update task status on approval:", err);
    }
  }

  // Notify submitter
  if (submission.submitted_by) {
    await sendNotification({
      companyId: form?.company_id ?? "",
      recipientId: submission.submitted_by,
      type: "form_submission_approved",
      title: "Form submission approved",
      message: `Your submission for "${form?.name ?? "a form"}" has been approved.${comment ? ` Comment: ${comment}` : ""}`,
      link: `/forms/my-forms`,
    });
  }

  revalidatePath(`/forms/${form?.id}/submissions`);
  return { success: true };
}

/**
 * Reject a submission. Updates status and sends notification to submitter.
 */
export async function rejectSubmission(submissionId: string, comment?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch submission with form info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submission } = await (supabase as any)
    .from("form_submissions")
    .select(
      `
      *,
      forms:form_id(id, name, company_id)
    `
    )
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Submission not found" };

  const { error: updateError } = await supabase
    .from("form_submissions")
    .update({ status: "rejected" })
    .eq("id", submissionId);

  if (updateError) return { error: "Failed to reject submission" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = submission.forms as any;

  // Notify submitter
  if (submission.submitted_by) {
    await sendNotification({
      companyId: form?.company_id ?? "",
      recipientId: submission.submitted_by,
      type: "form_submission_rejected",
      title: "Form submission rejected",
      message: `Your submission for "${form?.name ?? "a form"}" has been rejected.${comment ? ` Comment: ${comment}` : ""}`,
      link: `/forms/my-forms`,
    });
  }

  revalidatePath(`/forms/${form?.id}/submissions`);
  return { success: true };
}
