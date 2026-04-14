"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, buildApprovalEmail, buildStatusEmail } from "@/lib/utils/email";
import { formatFullName } from "@/lib/utils/format";
import { getSystemSetting } from "@/lib/utils/settings";

/**
 * Create an approval request with TL → DM chain.
 * Determines approvers from requester's department.
 */
export async function createApprovalRequest(params: {
  companyId: string;
  type: "manual_clock" | "leave_request";
  referenceId: string;
  requesterId: string;
  details: string;
}) {
  const supabase = await createClient();

  // Get requester's department info
  const { data: empDetail } = await supabase
    .from("employee_details")
    .select("department_id")
    .eq("profile_id", params.requesterId)
    .single();

  let teamLeaderId: string | null = null;
  let managerId: string | null = null;

  if (empDetail?.department_id) {
    const { data: dept } = await supabase
      .from("departments")
      .select("team_leader_id, manager_id")
      .eq("id", empDetail.department_id)
      .single();

    teamLeaderId = dept?.team_leader_id ?? null;
    managerId = dept?.manager_id ?? null;
  }

  // Build approver list (skip nulls, skip if approver is the requester)
  const approvers: string[] = [];
  if (teamLeaderId && teamLeaderId !== params.requesterId) approvers.push(teamLeaderId);
  if (managerId && managerId !== params.requesterId) approvers.push(managerId);

  // Fallback: if no approvers found, route to any HR user
  if (approvers.length === 0) {
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
      approvers.push(hrProfileIds[0]);
    }
  }

  if (approvers.length === 0) {
    return { error: "No approvers found. Please contact your administrator." };
  }

  const totalSteps = approvers.length;

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

  // Create approval steps
  for (let i = 0; i < approvers.length; i++) {
    await supabase.from("approval_steps").insert({
      approval_request_id: request.id,
      step_order: i + 1,
      approver_id: approvers[i],
    });
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

  // Send email to first approver
  const { data: firstStep } = await supabase
    .from("approval_steps")
    .select("id, token, approver_id")
    .eq("approval_request_id", request.id)
    .eq("step_order", 1)
    .single();

  if (firstStep) {
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
    if (step.step_order < request.total_steps) {
      // Advance to next step
      await supabase
        .from("approval_requests")
        .update({ current_step: step.step_order + 1 })
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

      // Send email to next approver
      const { data: nextStep } = await supabase
        .from("approval_steps")
        .select("id, token, approver_id")
        .eq("approval_request_id", request.id)
        .eq("step_order", step.step_order + 1)
        .single();

      if (nextStep) {
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
  }

  return { step, referenceDetails };
}
