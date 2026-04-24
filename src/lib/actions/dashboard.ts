/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCompanyId, getUserId, getDateRange } from "@/lib/actions/helpers";
import type { RoleName } from "@/types";

// ---------------------------------------------------------------------------
// Widget CRUD
// ---------------------------------------------------------------------------

export async function getMyWidgets() {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const { data } = await supabase
    .from("dashboard_widgets")
    .select("*")
    .eq("profile_id", userId)
    .order("position");
  return data ?? [];
}

export async function addWidget(
  widgetType: string,
  size: "small" | "medium" | "large",
) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not authenticated" };

  const companyId = await getCompanyId();
  if (!companyId) return { error: "Company not found" };

  const { data: existing } = await supabase
    .from("dashboard_widgets")
    .select("position")
    .eq("profile_id", userId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("dashboard_widgets").insert({
    profile_id: userId,
    company_id: companyId,
    widget_type: widgetType,
    position: nextPosition,
    size,
  });

  if (error) return { error: "Failed to add widget" };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeWidget(widgetId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dashboard_widgets")
    .delete()
    .eq("id", widgetId);
  if (error) return { error: "Failed to remove" };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateWidgetPosition(widgetId: string, position: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dashboard_widgets")
    .update({ position })
    .eq("id", widgetId);
  if (error) return { error: "Failed to update position" };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateWidgetSize(
  widgetId: string,
  size: "small" | "medium" | "large",
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dashboard_widgets")
    .update({ size })
    .eq("id", widgetId);
  if (error) return { error: "Failed to update size" };
  revalidatePath("/dashboard");
  return { success: true };
}

const DEFAULT_WIDGETS: Record<
  string,
  Array<{ type: string; size: "small" | "medium" | "large" }>
> = {
  base: [
    { type: "attendance_today", size: "small" },
    { type: "leave_balances", size: "medium" },
    { type: "my_tasks_summary", size: "small" },
    { type: "timesheet_week", size: "small" },
    { type: "pending_forms", size: "small" },
    { type: "out_of_office", size: "medium" },
  ],
  tldm: [
    { type: "team_task_progress", size: "medium" },
    { type: "pending_approvals", size: "small" },
    { type: "upcoming_leaves", size: "medium" },
  ],
  admin: [
    { type: "headcount_department", size: "medium" },
    { type: "attendance_trend", size: "large" },
    { type: "payroll_summary", size: "medium" },
    { type: "department_comparison", size: "large" },
    { type: "payroll_cost_trend", size: "large" },
  ],
};

export async function seedDefaultWidgets(roles: RoleName[]) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not authenticated" };

  const companyId = await getCompanyId();
  if (!companyId) return { error: "Profile not found" };

  // Check if user already has widgets
  const { data: existing } = await supabase
    .from("dashboard_widgets")
    .select("id")
    .eq("profile_id", userId)
    .limit(1);
  if (existing && existing.length > 0) return { success: true, seeded: false };

  const widgetsToAdd = [...DEFAULT_WIDGETS.base];
  if (roles.some((r) => r === "team_leader" || r === "dept_manager")) {
    widgetsToAdd.push(...DEFAULT_WIDGETS.tldm);
  }
  if (
    roles.some((r) =>
      ["admin", "hr", "business_manager", "director"].includes(r),
    )
  ) {
    widgetsToAdd.push(...DEFAULT_WIDGETS.admin);
  }

  for (let i = 0; i < widgetsToAdd.length; i++) {
    await supabase.from("dashboard_widgets").insert({
      profile_id: userId,
      company_id: companyId,
      widget_type: widgetsToAdd[i].type,
      position: i,
      size: widgetsToAdd[i].size,
    });
  }

  revalidatePath("/dashboard");
  return { success: true, seeded: true };
}

// ---------------------------------------------------------------------------
// Data fetching — one per widget type (19 functions)
// ---------------------------------------------------------------------------

/** 1. Attendance Today — user status + company-wide counts */
export async function fetchAttendanceToday(): Promise<{
  myStatus: string | null;
  companyPresent: number;
  companyLate: number;
  companyAbsent: number;
}> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId)
    return { myStatus: null, companyPresent: 0, companyLate: 0, companyAbsent: 0 };

  const companyId = await getCompanyId();

  const today = new Date().toISOString().split("T")[0];

  const [{ data: myRow }, { data: companyRows }] = await Promise.all([
    supabase
      .from("daily_attendance_summary")
      .select("status")
      .eq("profile_id", userId)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("daily_attendance_summary")
      .select("status")
      .eq("company_id", companyId!)
      .eq("date", today),
  ]);

  const rows = companyRows ?? [];
  const companyPresent = rows.filter((r: any) => r.status === "present").length;
  const companyLate = rows.filter((r: any) => r.status === "late").length;
  const companyAbsent = rows.filter(
    (r: any) => r.status === "absent" || r.status === "half_day",
  ).length;

  return {
    myStatus: myRow?.status ?? null,
    companyPresent,
    companyLate,
    companyAbsent,
  };
}

/** 2. Late Count Month — count of late days this month for current user */
export async function fetchLateCountMonth(): Promise<{ count: number }> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { count: 0 };

  const { start } = getDateRange("this_month");

  const { count } = await supabase
    .from("daily_attendance_summary")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", userId)
    .eq("is_late", true)
    .gte("date", start);

  return { count: count ?? 0 };
}

/** 3. Overtime Month — total approved OT hours this month */
export async function fetchOvertimeMonth(): Promise<{ hours: number }> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { hours: 0 };

  const { start } = getDateRange("this_month");

  const { data } = await supabase
    .from("overtime_requests")
    .select("total_hours")
    .eq("profile_id", userId)
    .eq("status", "approved")
    .gte("date", start);

  const hours = (data ?? []).reduce(
    (sum: number, r: any) => sum + (r.total_hours ?? 0),
    0,
  );
  return { hours };
}

/** 4. My Tasks Summary — count by todo/inProgress/done */
export async function fetchMyTasksSummary(): Promise<{
  todo: number;
  inProgress: number;
  done: number;
}> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { todo: 0, inProgress: 0, done: 0 };

  const { data } = await supabase
    .from("workspace_tasks")
    .select("completed_at, workspace_folder_statuses!status_id(is_done)")
    .eq("assignee_id", userId);

  let todo = 0;
  let inProgress = 0;
  let done = 0;

  for (const task of data ?? []) {
    const status = task.workspace_folder_statuses as any;
    const isDone = Array.isArray(status) ? status[0]?.is_done : status?.is_done;
    if (isDone) {
      done++;
    } else if (!task.completed_at) {
      todo++;
    } else {
      inProgress++;
    }
  }

  return { todo, inProgress, done };
}

/** 5. Overdue Tasks — count of tasks past target_end_date and not done */
export async function fetchOverdueTasks(): Promise<{ count: number }> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { count: 0 };

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("workspace_tasks")
    .select("id, workspace_folder_statuses!status_id(is_done)")
    .eq("assignee_id", userId)
    .lt("target_end_date", today)
    .not("target_end_date", "is", null);

  const overdue = (data ?? []).filter((task: any) => {
    const status = task.workspace_folder_statuses;
    const isDone = Array.isArray(status) ? status[0]?.is_done : status?.is_done;
    return !isDone;
  });

  return { count: overdue.length };
}

/** 6. Timesheet Week — hours logged vs required */
export async function fetchTimesheetWeek(): Promise<{
  loggedMinutes: number;
  requiredMinutes: number;
}> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { loggedMinutes: 0, requiredMinutes: 0 };

  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  const [{ data: entries }, { data: empDetail }] = await Promise.all([
    supabase
      .from("workspace_time_entries")
      .select("duration_minutes")
      .eq("profile_id", userId)
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("employee_details")
      .select("weekly_required_hours")
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  const loggedMinutes = (entries ?? []).reduce(
    (sum: number, e: any) => sum + (e.duration_minutes ?? 0),
    0,
  );
  const requiredMinutes = ((empDetail as any)?.weekly_required_hours ?? 40) * 60;

  return { loggedMinutes, requiredMinutes };
}

/** 7. Pending Approvals — count of approval steps pending for current user */
export async function fetchPendingApprovals(): Promise<{ count: number }> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { count: 0 };

  const { data } = await supabase
    .from("approval_steps")
    .select("id")
    .eq("approver_id", userId)
    .eq("status", "pending");

  return { count: data?.length ?? 0 };
}

/** 8. Pending Forms — count of assigned forms not completed */
export async function fetchPendingForms(): Promise<{ count: number }> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { count: 0 };

  const { data } = await supabase
    .from("form_assignments")
    .select("id")
    .eq("profile_id", userId)
    .eq("completed", false);

  return { count: data?.length ?? 0 };
}

/** 9. Leave Balances — current year balances for current user */
export async function fetchLeaveBalances(): Promise<
  Array<{ code: string; name: string; remaining: number; total: number }>
> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const currentYear = new Date().getFullYear();

  const { data } = await supabase
    .from("leave_balances")
    .select("remaining_days, total_days, leave_types(code, name)")
    .eq("profile_id", userId)
    .eq("year", currentYear)
    .eq("is_disabled", false);

  return (data ?? []).map((row: any) => ({
    code: row.leave_types?.code ?? "",
    name: row.leave_types?.name ?? "",
    remaining: row.remaining_days ?? 0,
    total: row.total_days ?? 0,
  }));
}

/** 10. Upcoming Leaves — next 5 approved leaves in company */
export async function fetchUpcomingLeaves(): Promise<
  Array<{
    name: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }>
> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const companyId = await getCompanyId();

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("leave_requests")
    .select(
      "start_date, end_date, profiles(first_name, last_name), leave_types(name)",
    )
    .eq("company_id", companyId ?? "")
    .eq("status", "approved")
    .gte("start_date", today)
    .order("start_date")
    .limit(5);

  return (data ?? []).map((row: any) => ({
    name: `${row.profiles?.first_name ?? ""} ${row.profiles?.last_name ?? ""}`.trim(),
    leaveType: row.leave_types?.name ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}

/** 11. Payroll Summary — latest payroll entry for current user */
export async function fetchPayrollSummary(): Promise<{
  grossPay: number;
  netPay: number;
  periodStart: string;
  periodEnd: string;
} | null> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from("payroll_entries")
    .select(
      "gross_pay, net_pay, payroll_periods(period_start, period_end)",
    )
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const period = (data as any).payroll_periods;
  return {
    grossPay: (data as any).gross_pay ?? 0,
    netPay: (data as any).net_pay ?? 0,
    periodStart: period?.period_start ?? "",
    periodEnd: period?.period_end ?? "",
  };
}

/** 12. Attendance Rate Month — present/late/absent percentages for donut */
export async function fetchAttendanceRateMonth(): Promise<{
  present: number;
  late: number;
  absent: number;
}> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { present: 0, late: 0, absent: 0 };

  const { start } = getDateRange("this_month");

  const { data } = await supabase
    .from("daily_attendance_summary")
    .select("status")
    .eq("profile_id", userId)
    .gte("date", start);

  const rows = data ?? [];
  const total = rows.length;
  if (total === 0) return { present: 0, late: 0, absent: 0 };

  const present = rows.filter((r: any) => r.status === "present").length;
  const late = rows.filter((r: any) => r.status === "late").length;
  const absent = total - present - late;

  return {
    present: Math.round((present / total) * 100),
    late: Math.round((late / total) * 100),
    absent: Math.round((absent / total) * 100),
  };
}

/** 13. Leave Usage Type — leave count by type for pie chart, company-wide this year */
export async function fetchLeaveUsageType(): Promise<
  Array<{ name: string; count: number; color: string }>
> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const companyId = await getCompanyId();

  const { start: startOfYear } = getDateRange("this_year");

  const { data } = await supabase
    .from("leave_requests")
    .select("leave_types(name, color)")
    .eq("company_id", companyId ?? "")
    .eq("status", "approved")
    .gte("start_date", startOfYear);

  const counts: Record<string, { name: string; count: number; color: string }> =
    {};
  for (const row of data ?? []) {
    const lt = (row as any).leave_types;
    const name = lt?.name ?? "Unknown";
    if (!counts[name]) {
      counts[name] = { name, count: 0, color: lt?.color ?? "#94a3b8" };
    }
    counts[name].count++;
  }

  return Object.values(counts).sort((a, b) => b.count - a.count);
}

/** 14. Task Completion Rate — completed vs pending tasks */
export async function fetchTaskCompletionRate(): Promise<{
  completed: number;
  pending: number;
}> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { completed: 0, pending: 0 };

  const companyId = await getCompanyId();

  const { data } = await supabase
    .from("workspace_tasks")
    .select("workspace_folder_statuses!status_id(is_done)")
    .eq("company_id", companyId ?? "");

  let completed = 0;
  let pending = 0;
  for (const task of data ?? []) {
    const status = (task as any).workspace_folder_statuses;
    const isDone = Array.isArray(status) ? status[0]?.is_done : status?.is_done;
    if (isDone) completed++;
    else pending++;
  }

  return { completed, pending };
}

/** 15. Team Task Progress — per-member completion % */
export async function fetchTeamTaskProgress(): Promise<
  Array<{
    name: string;
    completed: number;
    total: number;
    percentage: number;
  }>
> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const companyId = await getCompanyId();

  const { data } = await supabase
    .from("workspace_tasks")
    .select(
      "assignee_id, profiles!assignee_id(first_name, last_name), workspace_folder_statuses!status_id(is_done)",
    )
    .eq("company_id", companyId ?? "")
    .not("assignee_id", "is", null)
    .limit(1000);

  const memberMap: Record<
    string,
    { name: string; completed: number; total: number }
  > = {};

  for (const task of data ?? []) {
    const assigneeId = (task as any).assignee_id;
    if (!assigneeId) continue;
    const p = (task as any).profiles;
    const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || assigneeId;
    const status = (task as any).workspace_folder_statuses;
    const isDone = Array.isArray(status) ? status[0]?.is_done : status?.is_done;

    if (!memberMap[assigneeId]) {
      memberMap[assigneeId] = { name, completed: 0, total: 0 };
    }
    memberMap[assigneeId].total++;
    if (isDone) memberMap[assigneeId].completed++;
  }

  return Object.values(memberMap)
    .map((m) => ({
      ...m,
      percentage: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 10);
}

/** 16. Headcount Department — employee count per dept */
export async function fetchHeadcountDepartment(): Promise<
  Array<{ name: string; count: number }>
> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const companyId = await getCompanyId();

  const { data } = await supabase
    .from("employee_details")
    .select("department_id, departments!department_id(name)")
    .eq("company_id", companyId ?? "");

  const deptMap: Record<string, { name: string; count: number }> = {};
  for (const row of data ?? []) {
    const deptId = (row as any).department_id ?? "unassigned";
    const deptName = (row as any).departments?.name ?? "Unassigned";
    if (!deptMap[deptId]) {
      deptMap[deptId] = { name: deptName, count: 0 };
    }
    deptMap[deptId].count++;
  }

  return Object.values(deptMap).sort((a, b) => b.count - a.count);
}

/** 17. Attendance Trend — daily attendance rate last 30 days */
export async function fetchAttendanceTrend(): Promise<
  Array<{ date: string; rate: number }>
> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const companyId = await getCompanyId();

  const { start: startDate, end: today } = getDateRange("last_30_days");

  const { data } = await supabase
    .from("daily_attendance_summary")
    .select("date, status")
    .eq("company_id", companyId ?? "")
    .gte("date", startDate)
    .lte("date", today)
    .order("date");

  // Group by date
  const dateMap: Record<string, { present: number; total: number }> = {};
  for (const row of data ?? []) {
    const d = (row as any).date;
    if (!dateMap[d]) dateMap[d] = { present: 0, total: 0 };
    dateMap[d].total++;
    if (
      (row as any).status === "present" ||
      (row as any).status === "late"
    ) {
      dateMap[d].present++;
    }
  }

  return Object.entries(dateMap).map(([date, { present, total }]) => ({
    date,
    rate: total > 0 ? Math.round((present / total) * 100) : 0,
  }));
}

/** 18. Payroll Cost Trend — net pay total per period, last 6 periods */
export async function fetchPayrollCostTrend(): Promise<
  Array<{ period: string; netPay: number }>
> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const companyId = await getCompanyId();

  const { data } = await supabase
    .from("payroll_entries")
    .select("net_pay, payroll_periods!payroll_period_id(period_start, pay_date)")
    .eq("company_id", companyId ?? "")
    .order("created_at", { ascending: false })
    .limit(200);

  // Group by period
  const periodMap: Record<string, { netPay: number; payDate: string }> = {};
  for (const row of data ?? []) {
    const period = (row as any).payroll_periods;
    const periodStart = period?.period_start ?? "unknown";
    if (!periodMap[periodStart]) {
      periodMap[periodStart] = { netPay: 0, payDate: period?.pay_date ?? periodStart };
    }
    periodMap[periodStart].netPay += (row as any).net_pay ?? 0;
  }

  return Object.entries(periodMap)
    .sort(([, a], [, b]) => a.payDate.localeCompare(b.payDate))
    .slice(-6)
    .map(([period, { netPay }]) => ({ period, netPay }));
}

/** 19. Department Comparison — multi-metric per dept */
export async function fetchDepartmentComparison(): Promise<
  Array<{
    department: string;
    attendanceRate: number;
    lateRate: number;
    taskCompletion: number;
  }>
> {
  const supabase = await createClient();
  const companyId = await getCompanyId();
  if (!companyId) return [];

  const { start: startOfMonth } = getDateRange("this_month");

  // Fetch departments, employee_details, attendance, and tasks in parallel
  const [
    { data: depts },
    { data: empDetails },
    { data: attendance },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId),
    supabase
      .from("employee_details")
      .select("profile_id, department_id")
      .eq("company_id", companyId),
    supabase
      .from("daily_attendance_summary")
      .select("profile_id, status")
      .eq("company_id", companyId)
      .gte("date", startOfMonth),
    supabase
      .from("workspace_tasks")
      .select(
        "assignee_id, workspace_folder_statuses!status_id(is_done)",
      )
      .eq("company_id", companyId)
      .not("assignee_id", "is", null),
  ]);

  if (!depts || depts.length === 0) return [];

  const profileToDept: Record<string, string> = {};
  for (const e of empDetails ?? []) {
    if ((e as any).department_id) {
      profileToDept[(e as any).profile_id] = (e as any).department_id;
    }
  }

  // Build dept stats
  const deptStats: Record<
    string,
    {
      name: string;
      present: number;
      late: number;
      total: number;
      tasksCompleted: number;
      tasksTotal: number;
    }
  > = {};

  for (const dept of depts) {
    deptStats[(dept as any).id] = {
      name: (dept as any).name,
      present: 0,
      late: 0,
      total: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
    };
  }

  for (const row of attendance ?? []) {
    const deptId = profileToDept[(row as any).profile_id];
    if (!deptId || !deptStats[deptId]) continue;
    deptStats[deptId].total++;
    if ((row as any).status === "present") deptStats[deptId].present++;
    if ((row as any).status === "late") deptStats[deptId].late++;
  }

  for (const task of tasks ?? []) {
    const deptId = profileToDept[(task as any).assignee_id];
    if (!deptId || !deptStats[deptId]) continue;
    deptStats[deptId].tasksTotal++;
    const status = (task as any).workspace_folder_statuses;
    const isDone = Array.isArray(status) ? status[0]?.is_done : status?.is_done;
    if (isDone) deptStats[deptId].tasksCompleted++;
  }

  return Object.values(deptStats)
    .filter((d) => d.total > 0 || d.tasksTotal > 0)
    .map((d) => ({
      department: d.name,
      attendanceRate:
        d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0,
      lateRate: d.total > 0 ? Math.round((d.late / d.total) * 100) : 0,
      taskCompletion:
        d.tasksTotal > 0
          ? Math.round((d.tasksCompleted / d.tasksTotal) * 100)
          : 0,
    }));
}

/**
 * 20. Out of Office — members currently on approved leave + upcoming
 *     non-working days (holidays) for the company. Visible to all members.
 */
export async function fetchOutOfOffice(): Promise<{
  onLeave: Array<{
    name: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    startHalf: "am" | "pm" | null;
    endHalf: "am" | "pm" | null;
  }>;
  holidays: Array<{ name: string; date: string }>;
}> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { onLeave: [], holidays: [] };

  const companyId = await getCompanyId();
  const companyIdVal = companyId ?? "";

  const today = new Date().toISOString().split("T")[0];
  const in60 = new Date();
  in60.setDate(in60.getDate() + 60);
  const horizon = in60.toISOString().split("T")[0];

  // Currently on leave: approved leaves spanning today
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select(
      "start_date, end_date, start_half, end_half, profiles(first_name, last_name), leave_types(name)",
    )
    .eq("company_id", companyIdVal)
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today)
    .order("end_date");

  // Upcoming holidays within the next 60 days
  const { data: holidays } = await supabase
    .from("non_working_days")
    .select("name, date")
    .eq("company_id", companyIdVal)
    .gte("date", today)
    .lte("date", horizon)
    .order("date")
    .limit(10);

  return {
    onLeave: (leaves ?? []).map((row: any) => ({
      name: `${row.profiles?.first_name ?? ""} ${row.profiles?.last_name ?? ""}`.trim(),
      leaveType: row.leave_types?.name ?? "",
      startDate: row.start_date,
      endDate: row.end_date,
      startHalf: row.start_half ?? null,
      endHalf: row.end_half ?? null,
    })),
    holidays: (holidays ?? []).map((h: any) => ({ name: h.name, date: h.date })),
  };
}
