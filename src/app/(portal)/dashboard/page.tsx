import { getUserRoles } from "@/lib/actions/helpers";
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

export const dynamic = "force-dynamic";

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
  const roles = await getUserRoles();
  if (roles.length === 0) return null;

  let widgets = await getMyWidgets();
  if (widgets.length === 0) {
    await seedDefaultWidgets(roles);
    widgets = await getMyWidgets();
  }

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

  // Build hero metrics from widget data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const att = widgetData.attendance_today as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = widgetData.my_tasks_summary as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tc = widgetData.task_completion_rate as any;

  const totalAtt = (att?.companyPresent ?? 0) + (att?.companyLate ?? 0) + (att?.companyAbsent ?? 0);

  const heroData = {
    hoursToday: att?.myStatus === "present" || att?.myStatus === "late" ? 8 : 0,
    leaveBalance: Array.isArray(widgetData.leave_balances)
      ? (widgetData.leave_balances as any[]).reduce((sum: number, b: any) => sum + (b.remaining_days ?? 0), 0)
      : 0,
    myTasksDone: tasks?.done ?? 0,
    myTasksTotal: (tasks?.todo ?? 0) + (tasks?.inProgress ?? 0) + (tasks?.done ?? 0),
    pendingActions: ((widgetData.pending_approvals as any)?.count ?? 0) + ((widgetData.pending_forms as any)?.count ?? 0),
    presentToday: (att?.companyPresent ?? 0) + (att?.companyLate ?? 0),
    presentPercent: totalAtt > 0 ? Math.round(((att?.companyPresent ?? 0) + (att?.companyLate ?? 0)) / totalAtt * 100) : 0,
    pendingApprovals: (widgetData.pending_approvals as any)?.count ?? 0,
    payrollThisPeriod: (widgetData.payroll_summary as any)?.netPay ?? 0,
    openTasks: tc?.pending ?? 0,
    overduePercent: tc?.pending > 0 ? Math.round(((widgetData.overdue_tasks as any)?.count ?? 0) / tc.pending * 100) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your personalized overview</p>
        </div>
      </div>
      <DashboardGrid
        widgets={widgets}
        widgetData={widgetData}
        roles={roles}
        heroData={heroData}
      />
    </div>
  );
}
