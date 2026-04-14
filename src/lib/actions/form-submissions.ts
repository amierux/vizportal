"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { formatFullName } from "@/lib/utils/format";
import { sendNotification } from "@/lib/actions/notifications";
import { sendEmail } from "@/lib/utils/email";
import { getSystemSetting } from "@/lib/utils/settings";

/** Admin (service-role) client — bypasses RLS. Only used for public form submissions. */
function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
 * Public submissions (unauthenticated + is_public form) use the admin client
 * to bypass RLS, since the RLS insert policy cannot evaluate company_id when
 * there is no session.
 *
 * If save_to_list_enabled, creates a workspace_task in the target list.
 * If approval_enabled, creates form_submission_approvals + steps.
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

  // For public (unauthenticated) submissions use admin client to bypass RLS
  const isPublicSubmission = !user;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = isPublicSubmission ? getAdminClient() : supabase;

  // Fetch the form for settings + company
  const { data: form } = await db
    .from("forms")
    .select("id, name, company_id, save_to_list_enabled, target_list_id, approval_enabled, is_public, status")
    .eq("id", formId)
    .single();

  if (!form) return { error: "Form not found" };

  // Gate: form must be published
  if (form.status !== "published") return { error: "Form is not accepting submissions" };

  // Gate: public users can only submit public forms
  if (isPublicSubmission && !form.is_public) return { error: "This form requires authentication" };

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

  // Create submission — use admin client for public so RLS is not an obstacle
  const { data: submission, error: subError } = await db
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
      // Determine default status for the list (use authed or admin client)
      const listClient = isPublicSubmission ? db : supabase;

      const { data: list } = await listClient
        .from("workspace_lists")
        .select("folder_id, status_override")
        .eq("id", form.target_list_id)
        .single();

      let firstStatusId: string | null = null;

      if (list) {
        if (list.status_override) {
          const { data: listStatus } = await listClient
            .from("workspace_list_statuses")
            .select("id")
            .eq("list_id", form.target_list_id)
            .order("position", { ascending: true })
            .limit(1)
            .single();
          firstStatusId = listStatus?.id ?? null;
        } else {
          const { data: folderStatus } = await listClient
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
      const { data: lastTask } = await listClient
        .from("workspace_tasks")
        .select("position")
        .eq("list_id", form.target_list_id)
        .is("parent_task_id", null)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const nextPosition = lastTask ? lastTask.position + 1 : 0;

      const { data: task } = await db
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
        await db
          .from("form_submissions")
          .update({ saved_to_list: true, workspace_task_id: task.id })
          .eq("id", submissionId);
      }
    } catch (err) {
      // Non-fatal: log but continue
      console.error("Failed to create workspace task for form submission:", err);
    }
  }

  // Trigger new v2 approval flow if enabled
  if (form.approval_enabled) {
    try {
      // Fetch approval config + approvers — admin client so public submissions can read
      const { data: approvalConfig } = await db
        .from("form_approval_configs")
        .select(
          `
          id,
          approval_mode,
          form_approvers(profile_id, approver_email, approver_name, step_order)
        `
        )
        .eq("form_id", formId)
        .single();

      if (approvalConfig && Array.isArray(approvalConfig.form_approvers) && approvalConfig.form_approvers.length > 0) {
        const approvers: Array<{ profile_id: string | null; approver_email: string | null; approver_name: string | null; step_order: number }> =
          (approvalConfig.form_approvers as Array<{ profile_id: string | null; approver_email: string | null; approver_name: string | null; step_order: number }>)
            .sort((a, b) => a.step_order - b.step_order);

        const approvalMode: "hierarchical" | "any_one" | "any_order" = approvalConfig.approval_mode ?? "hierarchical";

        // Create the submission approval record
        const { data: approvalRecord } = await db
          .from("form_submission_approvals")
          .insert({
            submission_id: submissionId,
            status: "pending",
            approval_mode: approvalMode,
          })
          .select("id")
          .single();

        if (approvalRecord) {
          // Create individual step records
          const stepInserts = approvers.map((a) => {
            if (a.profile_id) {
              return {
                submission_approval_id: approvalRecord.id,
                approver_id: a.profile_id,
                step_order: a.step_order,
                status: "pending",
              };
            }
            return {
              submission_approval_id: approvalRecord.id,
              approver_id: null,
              approver_email: a.approver_email,
              approver_name: a.approver_name,
              step_order: a.step_order,
              status: "pending",
            };
          });

          // Insert and fetch back so we have the token for external approvers
          const { data: insertedSteps } = await db
            .from("form_submission_approval_steps")
            .insert(stepInserts)
            .select("id, approver_id, approver_email, approver_name, step_order, token");

          // Send notifications
          // hierarchical: only first step approvers; any_one + any_order: all approvers
          const toNotify =
            approvalMode === "hierarchical" ? approvers.filter((a) => a.step_order === approvers[0].step_order) : approvers;

          const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";

          for (const approver of toNotify) {
            if (approver.profile_id) {
              await sendNotification({
                companyId: form.company_id,
                recipientId: approver.profile_id,
                type: "form_approval_requested",
                title: "Form approval requested",
                message: `A new submission for "${form.name}" requires your approval.`,
                link: `/forms/${formId}/submissions`,
              });
            } else if (approver.approver_email && insertedSteps) {
              // Find the inserted step to get the token
              const matchedStep = (insertedSteps as Array<{ approver_id: string | null; approver_email: string | null; step_order: number; token: string }>)
                .find((s) => !s.approver_id && s.approver_email === approver.approver_email && s.step_order === approver.step_order);
              if (matchedStep) {
                const approvalUrl = `${appUrl}/forms/approve/${matchedStep.token}`;
                const approverName = approver.approver_name ?? "";
                await sendEmail({
                  to: approver.approver_email,
                  subject: `[VizPortal] Form approval needed: ${form.name}`,
                  html: `<div style="font-family: sans-serif; max-width: 600px;">
                    <h2>Form Approval Required</h2>
                    <p>Hi ${approverName},</p>
                    <p>A response to <strong>${form.name}</strong> requires your approval.</p>
                    <a href="${approvalUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Review &amp; Decide</a>
                    <p style="color: #666; font-size: 12px; margin-top: 24px;">This is your unique access link. Do not share.</p>
                  </div>`,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      // Non-fatal: approval creation failure should not block submission
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
 *
 * Public (unauthenticated) submissions use the admin client so storage RLS
 * does not block the upload.
 */
export async function uploadFormFile(formId: string, submissionId: string, file: File) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // For unauthenticated uploads use admin client to bypass storage RLS
  const isPublicUpload = !user;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = isPublicUpload ? getAdminClient() : supabase;

  // Get company_id from form
  const { data: form } = await db
    .from("forms")
    .select("company_id")
    .eq("id", formId)
    .single();

  if (!form) return { error: "Form not found" };

  const ext = file.name.split(".").pop();
  const path = `${form.company_id}/forms/${formId}/${submissionId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await db.storage.from("vizportal-storage").upload(path, file);

  if (error) return { error: "Failed to upload file" };

  const { data: publicUrlData } = db.storage
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

// ─── Shared approval finalization helper ─────────────────────────────────────

/**
 * After a step has been updated, evaluate mode-based logic and finalize the
 * approval record + submission status if complete. Works with any client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finalizeFormApproval(stepId: string, decision: "approved" | "rejected", db: any) {
  // Fetch the step
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: step } = await (db as any)
    .from("form_submission_approval_steps")
    .select("id, submission_approval_id, approver_id, step_order")
    .eq("id", stepId)
    .single();

  if (!step) return;

  // Fetch all steps for this approval record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allSteps } = await (db as any)
    .from("form_submission_approval_steps")
    .select("id, approver_id, approver_email, step_order, status")
    .eq("submission_approval_id", step.submission_approval_id)
    .order("step_order", { ascending: true });

  // Fetch the approval record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: approvalRecord } = await (db as any)
    .from("form_submission_approvals")
    .select("id, submission_id, approval_mode, status")
    .eq("id", step.submission_approval_id)
    .single();

  if (!approvalRecord || !allSteps) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submission } = await (db as any)
    .from("form_submissions")
    .select("id, submitted_by, company_id, forms:form_id(id, name)")
    .eq("id", approvalRecord.submission_id)
    .single();

  const mode: "hierarchical" | "any_one" | "any_order" = approvalRecord.approval_mode;

  let finalStatus: "approved" | "rejected" | null = null;
  const updatedSteps = allSteps.map((s: { id: string; status: string }) =>
    s.id === stepId ? { ...s, status: decision } : s
  );

  if (mode === "hierarchical") {
    if (decision === "rejected") {
      finalStatus = "rejected";
    } else {
      const allApproved = updatedSteps.every((s: { status: string }) => s.status === "approved");
      if (allApproved) {
        finalStatus = "approved";
      } else {
        // Notify next pending approver
        const nextStep = updatedSteps.find((s: { status: string; approver_id: string | null }) => s.status === "pending");
        if (nextStep && submission) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const form = (submission as any).forms;
          if (nextStep.approver_id) {
            await sendNotification({
              companyId: submission.company_id,
              recipientId: nextStep.approver_id,
              type: "form_approval_requested",
              title: "Form approval requested",
              message: `A new submission for "${form?.name ?? "a form"}" requires your approval.`,
              link: `/forms/${form?.id}/submissions`,
            });
          } else if (nextStep.approver_email) {
            // Fetch token for next external step
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: nextStepFull } = await (db as any)
              .from("form_submission_approval_steps")
              .select("token")
              .eq("id", nextStep.id)
              .single();
            if (nextStepFull) {
              const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
              const approvalUrl = `${appUrl}/forms/approve/${nextStepFull.token}`;
              await sendEmail({
                to: nextStep.approver_email,
                subject: `[VizPortal] Form approval needed: ${form?.name ?? "a form"}`,
                html: `<div style="font-family: sans-serif; max-width: 600px;">
                  <h2>Form Approval Required</h2>
                  <p>A response to <strong>${form?.name ?? "a form"}</strong> requires your approval.</p>
                  <a href="${approvalUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Review &amp; Decide</a>
                  <p style="color: #666; font-size: 12px; margin-top: 24px;">This is your unique access link. Do not share.</p>
                </div>`,
              });
            }
          }
        }
      }
    }
  } else if (mode === "any_order") {
    if (decision === "rejected") {
      finalStatus = "rejected";
    } else {
      const allApproved = updatedSteps.every((s: { status: string }) => s.status === "approved");
      if (allApproved) finalStatus = "approved";
    }
  } else {
    // any_one mode
    if (decision === "approved") {
      finalStatus = "approved";
    } else {
      const allRejected = updatedSteps.every((s: { status: string }) => s.status === "rejected");
      if (allRejected) finalStatus = "rejected";
    }
  }

  if (finalStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("form_submission_approvals")
      .update({ status: finalStatus })
      .eq("id", approvalRecord.id);

    await db
      .from("form_submissions")
      .update({ status: finalStatus })
      .eq("id", approvalRecord.submission_id);

    // Notify submitter if internal
    if (submission?.submitted_by) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const form = (submission as any).forms;
      const actionLabel = finalStatus === "approved" ? "approved" : "rejected";
      await sendNotification({
        companyId: submission.company_id,
        recipientId: submission.submitted_by,
        type: finalStatus === "approved" ? "form_submission_approved" : "form_submission_rejected",
        title: `Form submission ${actionLabel}`,
        message: `Your submission for "${form?.name ?? "a form"}" has been ${actionLabel}.`,
        link: `/forms/my-forms`,
      });
    }

    if (submission?.forms) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      revalidatePath(`/forms/${(submission.forms as any).id}/submissions`);
    }
  }
}

// ─── New v2 Approval Actions ──────────────────────────────────────────────────

/**
 * Get all pending approval steps assigned to the current user across all forms.
 */
export async function getMyPendingFormApprovals() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("form_submission_approval_steps")
    .select(
      `
      *,
      form_submission_approvals(
        id,
        status,
        approval_mode,
        form_submissions(
          id,
          submitted_at,
          respondent_name,
          respondent_email,
          forms:form_id(id, name)
        )
      )
    `
    )
    .eq("approver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return data ?? [];
}

/**
 * Process a form approval step — approve or reject.
 *
 * Hierarchical mode:
 *   - Approval: if all steps approved → mark submission_approval + submission as approved.
 *     If this is not the last step, notify the next approver.
 *   - Rejection: immediately rejects the submission_approval + submission.
 *
 * Any-one mode:
 *   - Any approval → immediately approve the whole submission.
 *   - Rejection: only reject if ALL approvers have rejected.
 */
export async function processFormApproval(
  stepId: string,
  decision: "approved" | "rejected",
  comment?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the step
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: step } = await (supabase as any)
    .from("form_submission_approval_steps")
    .select("*")
    .eq("id", stepId)
    .eq("approver_id", user.id)
    .eq("status", "pending")
    .single();

  if (!step) return { error: "Approval step not found or not actionable" };

  // Update the step
  await supabase
    .from("form_submission_approval_steps" as "workspace_task_approval_steps")
    .update({
      status: decision,
      comment: comment ?? null,
      decided_at: new Date().toISOString(),
    } as never)
    .eq("id", stepId);

  await finalizeFormApproval(stepId, decision, supabase);

  return { success: true };
}

/**
 * Process a form approval step via public token (for external approvers).
 * Uses admin client — no authentication required.
 */
export async function processFormApprovalByToken(
  token: string,
  decision: "approved" | "rejected",
  comment: string | null
) {
  const db = getAdminClient();

  // Find step by token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: step } = await (db as any)
    .from("form_submission_approval_steps")
    .select("id, submission_approval_id, status")
    .eq("token", token)
    .single();

  if (!step) return { error: "Approval not found" };
  if (step.status !== "pending") return { error: "This approval has already been decided" };

  // Update step
  await db
    .from("form_submission_approval_steps")
    .update({ status: decision, comment, decided_at: new Date().toISOString() })
    .eq("id", step.id);

  await finalizeFormApproval(step.id, decision, db);

  return { success: true };
}

// ─── Approve / Reject (legacy simple actions) ─────────────────────────────────

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
