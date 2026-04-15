"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, buildApprovalEmail, buildStatusEmail, buildReminderEmail } from "@/lib/utils/email";
import { formatFullName } from "@/lib/utils/format";
import { getSystemSetting } from "@/lib/utils/settings";

/**
 * Create an approval request with configurable approval chains.
 * Reads approval_configs and approval_config_steps to determine approvers.
 * Auto-approves if the config is disabled.
 * Supports types: manual_clock, leave_request, overtime.
 */
export async function createApprovalRequest(params: {
  companyId: string;
  type: "manual_clock" | "leave_request" | "overtime";
  referenceId: string;
  requesterId: string;
  details: string;
  relievers?: string[];
}) {
  const supabase = await createClient();

  // 1. Read approval_configs for the given type + company
  const { data: config } = await supabase
    .from("approval_configs")
    .select("id, is_enabled")
    .eq("company_id", params.companyId)
    .eq("type", params.type)
    .single();

  // 2. Auto-approve if config is disabled
  if (config && config.is_enabled === false) {
    await applyApprovalSideEffects(supabase, params.type, params.referenceId);
    return { success: true };
  }

  // 3. Get requester's department info
  const { data: empDetail } = await supabase
    .from("employee_details")
    .select("department_id")
    .eq("profile_id", params.requesterId)
    .single();

  let deptTeamLeaderId: string | null = null;
  let deptManagerId: string | null = null;

  if (empDetail?.department_id) {
    const { data: dept } = await supabase
      .from("departments")
      .select("team_leader_id, manager_id")
      .eq("id", empDetail.department_id)
      .single();

    deptTeamLeaderId = dept?.team_leader_id ?? null;
    deptManagerId = dept?.manager_id ?? null;
  }

  // 4. Get company-level approvers
  const { data: company } = await supabase
    .from("companies")
    .select("business_manager_id, director_id")
    .eq("id", params.companyId)
    .single();

  const businessManagerId = company?.business_manager_id ?? null;
  const directorId = company?.director_id ?? null;

  // 5. Read config steps if config exists
  interface ConfigStep {
    step_order: number;
    role: string;
    is_optional: boolean;
  }

  let configSteps: ConfigStep[] = [];
  if (config?.id) {
    const { data: steps } = await supabase
      .from("approval_config_steps")
      .select("step_order, role, is_optional")
      .eq("approval_config_id", config.id)
      .order("step_order", { ascending: true });

    configSteps = (steps ?? []) as ConfigStep[];
  }

  // If no config steps, fall back to legacy TL → DM chain
  if (configSteps.length === 0) {
    configSteps = [
      { step_order: 1, role: "team_leader", is_optional: false },
      { step_order: 2, role: "dept_manager", is_optional: true },
    ];
  }

  // 6. Resolve each config step to actual user ID(s)
  interface ResolvedStep {
    step_order: number;
    approver_ids: string[];
  }

  const resolvedSteps: ResolvedStep[] = [];

  for (const configStep of configSteps) {
    let approverIds: string[] = [];

    if (configStep.role === "team_leader") {
      if (deptTeamLeaderId) approverIds = [deptTeamLeaderId];
    } else if (configStep.role === "dept_manager") {
      if (deptManagerId) approverIds = [deptManagerId];
    } else if (configStep.role === "business_manager") {
      if (businessManagerId) approverIds = [businessManagerId];
    } else if (configStep.role === "director") {
      if (directorId) approverIds = [directorId];
    } else if (configStep.role === "reliever") {
      approverIds = (params.relievers ?? []).filter(Boolean);
    }

    // Filter out nulls and the requester themselves
    approverIds = approverIds.filter((id) => id && id !== params.requesterId);

    // Skip step if: no user resolved AND is_optional, OR no user resolved at all for required steps
    if (approverIds.length === 0 && configStep.is_optional) continue;
    if (approverIds.length === 0) continue;

    resolvedSteps.push({ step_order: configStep.step_order, approver_ids: approverIds });
  }

  // 7. HR fallback: if zero approvers after resolution
  if (resolvedSteps.length === 0) {
    const { data: hrUsers } = await supabase
      .from("user_roles")
      .select("profile_id, roles(name)")
      .eq("roles.name", "hr");

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const hrProfileIds = (hrUsers ?? [])
      .filter((ur: any) => ur.roles?.name === "hr" && ur.profile_id !== params.requesterId)
      .map((ur: any) => ur.profile_id);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (hrProfileIds.length > 0) {
      resolvedSteps.push({ step_order: 1, approver_ids: [hrProfileIds[0]] });
    }
  }

  if (resolvedSteps.length === 0) {
    return { error: "No approvers found. Please contact your administrator." };
  }

  // total_steps = number of distinct step_order values
  const distinctStepOrders = [...new Set(resolvedSteps.map((s) => s.step_order))];
  const totalSteps = distinctStepOrders.length;

  // Create approval request
  const { data: request, error: reqError } = await supabase
    .from("approval_requests")
    .insert({
      company_id: params.companyId,
      type: params.type,
      reference_id: params.referenceId,
      requester_id: params.requesterId,
      total_steps: totalSteps,
    })
    .select("id")
    .single();

  if (reqError || !request) return { error: "Failed to create approval request" };

  // Create approval steps (one row per approver, preserving step_order for siblings)
  for (const resolvedStep of resolvedSteps) {
    for (const approverId of resolvedStep.approver_ids) {
      await supabase.from("approval_steps").insert({
        approval_request_id: request.id,
        step_order: resolvedStep.step_order,
        approver_id: approverId,
      });
    }
  }

  // Get requester name for email
  const { data: requester } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", params.requesterId)
    .single();

  const requesterName = requester
    ? formatFullName(requester.first_name, requester.last_name)
    : "Unknown";

  // Send email to first approver(s) at step_order = min
  const firstStepOrder = distinctStepOrders[0];
  const { data: firstSteps } = await supabase
    .from("approval_steps")
    .select("id, token, approver_id")
    .eq("approval_request_id", request.id)
    .eq("step_order", firstStepOrder);

  for (const firstStep of firstSteps ?? []) {
    const { data: approver } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", firstStep.approver_id)
      .single();

    if (approver?.email) {
      const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
      const approvalUrl = `${appUrl}/approvals/${firstStep.token}`;
      const email = buildApprovalEmail({
        requesterName,
        type: params.type,
        details: params.details,
        approvalUrl,
      });

      await sendEmail({ to: approver.email, ...email });

      await supabase
        .from("approval_steps")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", firstStep.id);
    }
  }

  return { success: true, approvalRequestId: request.id };
}

/**
 * Process an approval decision (approve or reject) for a given step.
 * Handles multi-approver reliever steps: only advances when all siblings at same step_order are approved.
 */
export async function processApprovalDecision(
  token: string,
  decision: "approved" | "rejected",
  comment: string | null
) {
  const supabase = await createClient();

  // Find the step by token
  const { data: step } = await supabase
    .from("approval_steps")
    .select("*, approval_requests(*)")
    .eq("token", token)
    .single();

  if (!step) return { error: "Approval not found" };
  if (step.status !== "pending") return { error: "This approval has already been decided" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = step.approval_requests as any;

  // Update the step
  await supabase
    .from("approval_steps")
    .update({
      status: decision,
      comment,
      decided_at: new Date().toISOString(),
    })
    .eq("id", step.id);

  // Get names for emails
  const { data: approver } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", step.approver_id)
    .single();

  const approverName = approver
    ? formatFullName(approver.first_name, approver.last_name)
    : "Unknown";

  const { data: requester } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", request.requester_id)
    .single();

  const requesterName = requester
    ? formatFullName(requester.first_name, requester.last_name)
    : "Unknown";

  if (decision === "rejected") {
    // Reject entire request
    await supabase
      .from("approval_requests")
      .update({ status: "rejected" })
      .eq("id", request.id);

    // Apply rejection side effects
    await applyRejectionSideEffects(supabase, request.type, request.reference_id);

    // Notify requester
    if (requester?.email) {
      const email = buildStatusEmail({
        recipientName: requesterName,
        type: request.type,
        status: "rejected",
        approverName,
        comment,
      });
      await sendEmail({ to: requester.email, ...email });
    }
  } else if (decision === "approved") {
    // Check if there are other pending sibling steps at the same step_order
    const { data: siblingSteps } = await supabase
      .from("approval_steps")
      .select("id, status")
      .eq("approval_request_id", request.id)
      .eq("step_order", step.step_order)
      .neq("id", step.id);

    const hasPendingSiblings = (siblingSteps ?? []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.status === "pending"
    );

    if (hasPendingSiblings) {
      // Other relievers at this step still pending — don't advance yet
      revalidatePath("/approvals");
      return { success: true };
    }

    // Determine next step order
    const { data: allSteps } = await supabase
      .from("approval_steps")
      .select("step_order")
      .eq("approval_request_id", request.id)
      .order("step_order", { ascending: true });

    const distinctOrders = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...new Set((allSteps ?? []).map((s: any) => s.step_order as number)),
    ].sort((a, b) => a - b);

    const currentIndex = distinctOrders.indexOf(step.step_order);
    const nextStepOrder =
      currentIndex < distinctOrders.length - 1 ? distinctOrders[currentIndex + 1] : null;

    if (nextStepOrder !== null) {
      // Advance to next step
      await supabase
        .from("approval_requests")
        .update({ current_step: nextStepOrder })
        .eq("id", request.id);

      // Notify requester of partial approval
      if (requester?.email) {
        const email = buildStatusEmail({
          recipientName: requesterName,
          type: request.type,
          status: "approved",
          approverName,
          comment,
        });
        await sendEmail({ to: requester.email, ...email });
      }

      // Send email to next approver(s)
      const { data: nextSteps } = await supabase
        .from("approval_steps")
        .select("id, token, approver_id")
        .eq("approval_request_id", request.id)
        .eq("step_order", nextStepOrder);

      for (const nextStep of nextSteps ?? []) {
        const { data: nextApprover } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", nextStep.approver_id)
          .single();

        if (nextApprover?.email) {
          const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
          const approvalUrl = `${appUrl}/approvals/${nextStep.token}`;
          const emailContent = buildApprovalEmail({
            requesterName,
            type: request.type,
            details: `Approved by ${approverName} (Step ${step.step_order}/${request.total_steps})`,
            approvalUrl,
          });
          await sendEmail({ to: nextApprover.email, ...emailContent });

          await supabase
            .from("approval_steps")
            .update({ email_sent_at: new Date().toISOString() })
            .eq("id", nextStep.id);
        }
      }
    } else {
      // Final approval — mark request as approved
      await supabase
        .from("approval_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      // Apply approval side effects
      await applyApprovalSideEffects(supabase, request.type, request.reference_id);

      // Notify requester
      if (requester?.email) {
        const email = buildStatusEmail({
          recipientName: requesterName,
          type: request.type,
          status: "approved",
          approverName,
          comment,
        });
        await sendEmail({ to: requester.email, ...email });
      }
    }
  }

  revalidatePath("/approvals");
  return { success: true };
}

/**
 * Apply side effects when an approval request is fully approved.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyApprovalSideEffects(supabase: any, type: string, referenceId: string) {
  if (type === "manual_clock") {
    // Mark clock entry as approved manual
    await supabase
      .from("clock_entries")
      .update({ manual_remarks: "Manual entry (approved)" })
      .eq("id", referenceId);

    // Recalculate daily summary would be triggered by the attendance module
  } else if (type === "leave_request") {
    // Update leave request status
    await supabase
      .from("leave_requests")
      .update({ status: "approved" })
      .eq("id", referenceId);

    // Get leave request details for balance update
    const { data: leaveReq } = await supabase
      .from("leave_requests")
      .select("profile_id, leave_type_id, total_days, start_date")
      .eq("id", referenceId)
      .single();

    if (leaveReq) {
      const year = new Date(leaveReq.start_date).getFullYear();

      // Update leave balance
      const { data: balance } = await supabase
        .from("leave_balances")
        .select("id, used_days, remaining_days")
        .eq("profile_id", leaveReq.profile_id)
        .eq("leave_type_id", leaveReq.leave_type_id)
        .eq("year", year)
        .single();

      if (balance) {
        await supabase
          .from("leave_balances")
          .update({
            used_days: balance.used_days + leaveReq.total_days,
            remaining_days: balance.remaining_days - leaveReq.total_days,
          })
          .eq("id", balance.id);
      }
    }
  } else if (type === "overtime") {
    await supabase
      .from("overtime_requests")
      .update({ status: "approved" })
      .eq("id", referenceId);
  }
}

/**
 * Apply side effects when an approval request is rejected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyRejectionSideEffects(supabase: any, type: string, referenceId: string) {
  if (type === "manual_clock") {
    // Delete the manual clock entry
    await supabase
      .from("clock_entries")
      .delete()
      .eq("id", referenceId);
  } else if (type === "leave_request") {
    // Update leave request status
    await supabase
      .from("leave_requests")
      .update({ status: "rejected" })
      .eq("id", referenceId);
  } else if (type === "overtime") {
    await supabase
      .from("overtime_requests")
      .update({ status: "rejected" })
      .eq("id", referenceId);
  }
}

/**
 * Cancel an approval request (by requester).
 */
export async function cancelApprovalRequest(approvalRequestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", approvalRequestId)
    .eq("requester_id", user.id)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found or cannot be cancelled" };

  // Cancel the request
  await supabase
    .from("approval_requests")
    .update({ status: "cancelled" })
    .eq("id", approvalRequestId);

  // Cancel all pending steps
  await supabase
    .from("approval_steps")
    .update({ status: "rejected" })
    .eq("approval_request_id", approvalRequestId)
    .eq("status", "pending");

  // Apply cancellation side effects
  if (request.type === "manual_clock") {
    await supabase.from("clock_entries").delete().eq("id", request.reference_id);
  } else if (request.type === "leave_request") {
    await supabase
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", request.reference_id);
  } else if (request.type === "overtime") {
    await supabase
      .from("overtime_requests")
      .update({ status: "cancelled" })
      .eq("id", request.reference_id);
  }

  revalidatePath("/approvals");
  return { success: true };
}

/**
 * Get pending approvals for the current user.
 */
export async function getMyPendingApprovals() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: steps } = await supabase
    .from("approval_steps")
    .select(`
      *,
      approval_requests(
        id, type, reference_id, requester_id, status, current_step, total_steps, created_at,
        requester:profiles!approval_requests_requester_id_fkey(first_name, last_name, email)
      )
    `)
    .eq("approver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Filter to only show steps where it's their turn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (steps ?? []).filter((step: any) => {
    const req = step.approval_requests;
    return req && req.status === "pending" && req.current_step === step.step_order;
  });
}

/**
 * Get the approval chain detail for a request by type + reference_id.
 * Returns the approval_request + steps with approver names.
 */
export async function getRequestApprovalDetail(type: string, referenceId: string) {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request } = await (supabase as any)
    .from("approval_requests")
    .select(`
      id, type, status, current_step, total_steps, created_at,
      approval_steps(
        id, approver_id, step_order, status, comment, decided_at, email_sent_at, reminder_sent_at,
        approver:profiles!approval_steps_approver_id_fkey(first_name, last_name, email)
      )
    `)
    .eq("type", type)
    .eq("reference_id", referenceId)
    .single();

  if (!request) return null;

  // Sort steps by step_order
  if (Array.isArray(request.approval_steps)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request.approval_steps.sort((a: any, b: any) => a.step_order - b.step_order);
  }

  return request;
}

/**
 * Send a follow-up email to the current pending approver(s) for a request.
 * Updates reminder_sent_at on the steps.
 */
export async function followUpApproval(type: string, referenceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const detail = await getRequestApprovalDetail(type, referenceId);
  if (!detail) return { error: "Approval request not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingSteps = ((detail as any).approval_steps ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.status === "pending" && s.step_order === detail.current_step
  );

  if (pendingSteps.length === 0) return { error: "No pending approver to follow up with" };

  // Get requester name
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  const requesterName = requesterProfile
    ? `${requesterProfile.first_name ?? ""} ${requesterProfile.last_name ?? ""}`.trim()
    : "Requester";

  const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";

  const daysPending = Math.max(
    1,
    Math.floor((Date.now() - new Date(detail.created_at).getTime()) / (1000 * 60 * 60 * 24))
  );

  let sent = 0;
  for (const step of pendingSteps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approver = (step as any).approver;
    if (!approver?.email) continue;

    const approverName = `${approver.first_name ?? ""} ${approver.last_name ?? ""}`.trim();
    const approvalUrl = `${appUrl}/approvals/${step.token}`;
    const email = buildReminderEmail({
      approverName,
      requesterName,
      type,
      approvalUrl,
      daysPending,
    });
    await sendEmail({ to: approver.email, ...email });

    await supabase
      .from("approval_steps")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", step.id);
    sent++;
  }

  return { success: true, sent };
}

/**
 * Get approval request details by token (for public approval page).
 */
export async function getApprovalByToken(token: string) {
  const supabase = await createClient();

  const { data: step } = await supabase
    .from("approval_steps")
    .select(`
      *,
      approval_requests(
        id, type, reference_id, requester_id, status, current_step, total_steps, created_at,
        requester:profiles!approval_requests_requester_id_fkey(first_name, last_name, email)
      )
    `)
    .eq("token", token)
    .single();

  if (!step) return null;

  // Fetch reference details based on type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = step.approval_requests as any;
  let referenceDetails = null;

  if (request?.type === "manual_clock") {
    const { data } = await supabase
      .from("clock_entries")
      .select("*")
      .eq("id", request.reference_id)
      .single();
    referenceDetails = data;
  } else if (request?.type === "leave_request") {
    const { data } = await supabase
      .from("leave_requests")
      .select("*, leave_types(name, code)")
      .eq("id", request.reference_id)
      .single();
    referenceDetails = data;
  } else if (request?.type === "overtime") {
    const { data } = await supabase
      .from("overtime_requests")
      .select("*")
      .eq("id", request.reference_id)
      .single();
    referenceDetails = data;
  }

  return { step, referenceDetails };
}
