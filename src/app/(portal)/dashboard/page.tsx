import { createClient } from "@/lib/supabase/server";
import {
  getMyWidgets,
  seedDefaultWidgets,
  fetchAttendanceToday,
  fetchLateCountMonth,
  fetchOvertimeMonth,
  fetchMyTasksSummary,
  fetchOverdueTasks,
  fetchTimesheetWeek,
  fetchPendingApprovals,
  fetchPendingForms,
  fetchLeaveBalances,
  fetchUpcomingLeaves,
  fetchPayrollSummary,
  fetchAttendanceRateMonth,
  fetchLeaveUsageType,
  fetchTaskCompletionRate,
  fetchTeamTaskProgress,
  fetchHeadcountDepartment,
  fetchAttendanceTrend,
  fetchPayrollCostTrend,
  fetchDepartmentComparison,
  fetchOutOfOffice,
} from "@/lib/actions/dashboard";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import type { RoleName } from "@/types";

const WIDGET_FETCHERS: Record<string, () => Promise<unknown>> = {
  attendance_today: fetchAttendanceToday,
  late_count_month: fetchLateCountMonth,
  overtime_month: fetchOvertimeMonth,
  my_tasks_summary: fetchMyTasksSummary,
  overdue_tasks: fetchOverdueTasks,
  timesheet_week: fetchTimesheetWeek,
  pending_approvals: fetchPendingApprovals,
  pending_forms: fetchPendingForms,
  leave_balances: fetchLeaveBalances,
  upcoming_leaves: fetchUpcomingLeaves,
  payroll_summary: fetchPayrollSummary,
  attendance_rate_month: fetchAttendanceRateMonth,
  leave_usage_type: fetchLeaveUsageType,
  task_completion_rate: fetchTaskCompletionRate,
  team_task_progress: fetchTeamTaskProgress,
  headcount_department: fetchHeadcountDepartment,
  attendance_trend: fetchAttendanceTrend,
  payroll_cost_trend: fetchPayrollCostTrend,
  department_comparison: fetchDepartmentComparison,
  out_of_office: fetchOutOfOffice,
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRoles ?? []).map((ur: any) => ur.roles.name);

  // Seed defaults if needed
  let widgets = await getMyWidgets();
  if (widgets.length === 0) {
    await seedDefaultWidgets(roles);
    widgets = await getMyWidgets();
  }

  // Fetch data for all widgets in parallel — resilient to individual failures
  const uniqueTypes = Array.from(new Set(widgets.map((w) => w.widget_type)));
  const dataEntries = await Promise.all(
    uniqueTypes.map(async (type) => {
      const fetcher = WIDGET_FETCHERS[type];
      if (!fetcher) return [type, null] as const;
      try {
        const data = await fetcher();
        return [type, data] as const;
      } catch (err) {
        console.error(`Widget fetcher failed: ${type}`, err);
        return [type, null] as const;
      }
    }),
  );
  const widgetData = Object.fromEntries(dataEntries);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your personalized overview</p>
      </div>
      <DashboardGrid widgets={widgets} widgetData={widgetData} />
    </div>
  );
}
