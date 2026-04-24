"use server";

import { createClient } from "@/lib/supabase/server";
import { getCompanyId, getUserRoles, getDateRange, hasRole } from "@/lib/actions/helpers";
import type { RoleName } from "@/types";

const ADMIN_ROLES: RoleName[] = ["admin", "hr", "director", "business_manager"];
const MANAGER_ROLES: RoleName[] = [...ADMIN_ROLES, "dept_manager", "team_leader"];

export async function fetchAttendanceAnalytics(dateFrom?: string, dateTo?: string, departmentId?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_attendance_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
    p_department_id: departmentId ?? null,
  });

  if (error) {
    console.error("rpc_attendance_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchLeaveAnalytics(dateFrom?: string, dateTo?: string, departmentId?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_leave_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
    p_department_id: departmentId ?? null,
  });

  if (error) {
    console.error("rpc_leave_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchPayrollAnalytics(periodCount?: number) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, ADMIN_ROLES)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_payroll_analytics", {
    p_company_id: companyId,
    p_period_count: periodCount ?? 6,
  });

  if (error) {
    console.error("rpc_payroll_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchEmployeeAnalytics() {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_employee_analytics", {
    p_company_id: companyId,
  });

  if (error) {
    console.error("rpc_employee_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchWorkspaceAnalytics(dateFrom?: string, dateTo?: string, folderId?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_workspace_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
    p_folder_id: folderId ?? null,
  });

  if (error) {
    console.error("rpc_workspace_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchTimesheetAnalytics(weekStart?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const ws = weekStart ?? (() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split("T")[0];
  })();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_timesheet_analytics", {
    p_company_id: companyId,
    p_week_start: ws,
  });

  if (error) {
    console.error("rpc_timesheet_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchOvertimeAnalytics(dateFrom?: string, dateTo?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_overtime_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
  });

  if (error) {
    console.error("rpc_overtime_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchApprovalAnalytics(dateFrom?: string, dateTo?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_approval_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
  });

  if (error) {
    console.error("rpc_approval_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchFormAnalytics() {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, ADMIN_ROLES)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_form_analytics", {
    p_company_id: companyId,
  });

  if (error) {
    console.error("rpc_form_analytics error:", error);
    return null;
  }
  return data;
}
