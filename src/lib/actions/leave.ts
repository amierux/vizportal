"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createApprovalRequest } from "@/lib/actions/approvals";
import { leaveRequestSchema } from "@/lib/validations/leave";
import { countWorkDays } from "@/lib/utils/attendance";

/**
 * File a new leave request.
 */
export async function fileLeaveRequest(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rawData = {
    leave_type_id: formData.get("leave_type_id") as string,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    reason: (formData.get("reason") as string) || undefined,
  };

  const parsed = leaveRequestSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  // Get employee schedule for work day calculation
  const { data: schedule } = await supabase
    .from("employee_schedules")
    .select("work_days")
    .eq("profile_id", user.id)
    .single();

  const workDays = schedule?.work_days ?? ["mon", "tue", "wed", "thu", "fri"];
  const totalDays = countWorkDays(parsed.data.start_date, parsed.data.end_date, workDays);

  if (totalDays === 0) return { error: "No work days in selected range" };

  // Check leave type validity
  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("*")
    .eq("id", parsed.data.leave_type_id)
    .eq("is_active", true)
    .single();

  if (!leaveType) return { error: "Invalid leave type" };

  // Check gender applicability
  if (leaveType.applicable_gender !== "all") {
    const { data: empDetail } = await supabase
      .from("employee_details")
      .select("gender")
      .eq("profile_id", user.id)
      .single();

    if (empDetail?.gender && empDetail.gender !== leaveType.applicable_gender) {
      return { error: "This leave type is not applicable to your gender" };
    }
  }

  // Check balance
  const year = new Date(parsed.data.start_date).getFullYear();
  const { data: balance } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("profile_id", user.id)
    .eq("leave_type_id", parsed.data.leave_type_id)
    .eq("year", year)
    .single();

  if (!balance || balance.remaining_days < totalDays) {
    return {
      error: `Insufficient balance. You have ${balance?.remaining_days ?? 0} days remaining.`,
    };
  }

  // Check for overlapping approved leaves
  const { data: overlapping } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "approved")
    .lte("start_date", parsed.data.end_date)
    .gte("end_date", parsed.data.start_date)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return { error: "You have an overlapping approved leave for these dates" };
  }

  // Attachment URL is uploaded client-side to storage; URL passed as hidden field
  let attachmentUrl: string | null = null;
  const attachmentField = formData.get("attachment_url") as string;
  if (attachmentField) attachmentUrl = attachmentField;

  // Create leave request
  const { data: request, error: insertError } = await supabase
    .from("leave_requests")
    .insert({
      company_id: profile.company_id,
      profile_id: user.id,
      leave_type_id: parsed.data.leave_type_id,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      total_days: totalDays,
      reason: parsed.data.reason ?? null,
      attachment_url: attachmentUrl,
    })
    .select("id")
    .single();

  if (insertError || !request) return { error: "Failed to create leave request" };

  // Create approval request
  const approvalResult = await createApprovalRequest({
    companyId: profile.company_id,
    type: "leave_request",
    referenceId: request.id,
    requesterId: user.id,
    details: `<p><strong>Leave Type:</strong> ${leaveType.name} (${leaveType.code})</p>
      <p><strong>Dates:</strong> ${parsed.data.start_date} to ${parsed.data.end_date}</p>
      <p><strong>Total Days:</strong> ${totalDays}</p>
      ${parsed.data.reason ? `<p><strong>Reason:</strong> ${parsed.data.reason}</p>` : ""}`,
  });

  if ("error" in approvalResult) return { error: approvalResult.error };

  revalidatePath("/leave");
  return { success: true };
}

/**
 * Get current user's leave balances for current year.
 */
export async function getMyLeaveBalances() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("leave_balances")
    .select("*, leave_types(name, code, is_paid)")
    .eq("profile_id", user.id)
    .eq("year", year)
    .order("leave_types(name)");

  return data ?? [];
}

/**
 * Get current user's leave requests.
 */
export async function getMyLeaveRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("leave_requests")
    .select("*, leave_types(name, code)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Cancel a pending leave request.
 */
export async function cancelLeaveRequest(requestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("leave_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found or cannot be cancelled" };

  await supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  // Cancel associated approval request
  const { data: approvalReq } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("type", "leave_request")
    .eq("reference_id", requestId)
    .eq("status", "pending")
    .single();

  if (approvalReq) {
    const { cancelApprovalRequest } = await import("@/lib/actions/approvals");
    await cancelApprovalRequest(approvalReq.id);
  }

  revalidatePath("/leave");
  return { success: true };
}

/**
 * Get all leave requests with filters (admin/HR view).
 */
export async function getLeaveRequests(filters: {
  status?: string;
  departmentId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("leave_requests")
    .select(
      `
      *,
      leave_types(name, code),
      profiles:profile_id(id, first_name, last_name,
        employee_details(department_id, departments(name))
      )
    `
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status as "pending" | "approved" | "rejected" | "cancelled");
  if (filters.leaveTypeId) query = query.eq("leave_type_id", filters.leaveTypeId);
  if (filters.startDate) query = query.gte("start_date", filters.startDate);
  if (filters.endDate) query = query.lte("end_date", filters.endDate);

  const { data } = await query;

  let filtered = data ?? [];
  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = filtered.filter((row: any) => {
      return row.profiles?.employee_details?.department_id === filters.departmentId;
    });
  }

  return filtered;
}

/**
 * Get all employee balances (admin/HR view).
 */
export async function getAllLeaveBalances(filters: {
  year?: number;
  departmentId?: string;
}) {
  const supabase = await createClient();
  const year = filters.year ?? new Date().getFullYear();

  const { data } = await supabase
    .from("leave_balances")
    .select(
      `
      *,
      leave_types(name, code),
      profiles:profile_id(id, first_name, last_name,
        employee_details(department_id, departments(name))
      )
    `
    )
    .eq("year", year);

  let filtered = data ?? [];
  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = filtered.filter((row: any) => {
      return row.profiles?.employee_details?.department_id === filters.departmentId;
    });
  }

  return filtered;
}

/**
 * Manually adjust an employee's leave balance (admin/HR).
 */
export async function adjustLeaveBalance(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient();

  const balanceId = formData.get("_balanceId") as string;
  const totalDays = Number(formData.get("total_days"));
  const usedDays = Number(formData.get("used_days"));

  if (isNaN(totalDays) || isNaN(usedDays)) {
    return { error: "Invalid numbers" };
  }

  const remainingDays = totalDays - usedDays;

  const { error } = await supabase
    .from("leave_balances")
    .update({
      total_days: totalDays,
      used_days: usedDays,
      remaining_days: remainingDays,
    })
    .eq("id", balanceId);

  if (error) return { error: "Failed to adjust balance" };

  revalidatePath("/leave/manage");
  return { success: true };
}

/**
 * Get approved leaves for team calendar (TL/DM and admin).
 */
export async function getTeamLeaves(filters: {
  startDate: string;
  endDate: string;
}) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      leave_types(name, code),
      profiles:profile_id(id, first_name, last_name)
    `
    )
    .eq("status", "approved")
    .lte("start_date", filters.endDate)
    .gte("end_date", filters.startDate);

  return data ?? [];
}
