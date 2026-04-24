"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { DashboardWidget } from "@/types";
import { Button } from "@/components/ui/button";
import { removeWidget, updateWidgetSize } from "@/lib/actions/dashboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const widgetComponents: Record<string, React.ComponentType<{ data: any }>> = {
  attendance_today: dynamic(() => import("./widgets/attendance-today").then(m => ({ default: m.AttendanceTodayWidget }))),
  late_count_month: dynamic(() => import("./widgets/late-count-month").then(m => ({ default: m.LateCountMonthWidget }))),
  overtime_month: dynamic(() => import("./widgets/overtime-month").then(m => ({ default: m.OvertimeMonthWidget }))),
  my_tasks_summary: dynamic(() => import("./widgets/my-tasks-summary").then(m => ({ default: m.MyTasksSummaryWidget }))),
  overdue_tasks: dynamic(() => import("./widgets/overdue-tasks").then(m => ({ default: m.OverdueTasksWidget }))),
  timesheet_week: dynamic(() => import("./widgets/timesheet-week").then(m => ({ default: m.TimesheetWeekWidget }))),
  pending_approvals: dynamic(() => import("./widgets/pending-approvals").then(m => ({ default: m.PendingApprovalsWidget }))),
  pending_forms: dynamic(() => import("./widgets/pending-forms").then(m => ({ default: m.PendingFormsWidget }))),
  leave_balances: dynamic(() => import("./widgets/leave-balances").then(m => ({ default: m.LeaveBalancesWidget }))),
  upcoming_leaves: dynamic(() => import("./widgets/upcoming-leaves").then(m => ({ default: m.UpcomingLeavesWidget }))),
  payroll_summary: dynamic(() => import("./widgets/payroll-summary").then(m => ({ default: m.PayrollSummaryWidget }))),
  attendance_rate_month: dynamic(() => import("./widgets/attendance-rate-month").then(m => ({ default: m.AttendanceRateMonthWidget }))),
  leave_usage_type: dynamic(() => import("./widgets/leave-usage-type").then(m => ({ default: m.LeaveUsageTypeWidget }))),
  task_completion_rate: dynamic(() => import("./widgets/task-completion-rate").then(m => ({ default: m.TaskCompletionRateWidget }))),
  team_task_progress: dynamic(() => import("./widgets/team-task-progress").then(m => ({ default: m.TeamTaskProgressWidget }))),
  headcount_department: dynamic(() => import("./widgets/headcount-department").then(m => ({ default: m.HeadcountDepartmentWidget }))),
  attendance_trend: dynamic(() => import("./widgets/attendance-trend").then(m => ({ default: m.AttendanceTrendWidget }))),
  payroll_cost_trend: dynamic(() => import("./widgets/payroll-cost-trend").then(m => ({ default: m.PayrollCostTrendWidget }))),
  department_comparison: dynamic(() => import("./widgets/department-comparison").then(m => ({ default: m.DepartmentComparisonWidget }))),
  out_of_office: dynamic(() => import("./widgets/out-of-office").then(m => ({ default: m.OutOfOfficeWidget }))),
};

type WidgetSize = "small" | "medium" | "large";

type Props = {
  widget: DashboardWidget;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

function sizeClass(size: WidgetSize): string {
  switch (size) {
    case "large":
      return "lg:col-span-3 md:col-span-2";
    case "medium":
      return "md:col-span-2";
    default:
      return "col-span-1";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderWidget(type: string, data: any) {
  if (!data) return <div className="text-sm text-muted-foreground p-4">No data available.</div>;

  const Widget = widgetComponents[type];
  if (!Widget) return <div className="text-sm text-muted-foreground p-4">Unknown widget type.</div>;

  return <Widget data={data} />;
}

export function WidgetCard({ widget, data }: Props) {
  const [hovered, setHovered] = useState(false);
  const [pending, setPending] = useState(false);

  const size = widget.size as WidgetSize;

  async function handleRemove() {
    setPending(true);
    await removeWidget(widget.id);
    setPending(false);
  }

  async function handleSizeChange(newSize: WidgetSize) {
    setPending(true);
    await updateWidgetSize(widget.id, newSize);
    setPending(false);
  }

  return (
    <div
      className={`relative ${sizeClass(size)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {renderWidget(widget.widget_type, data)}

      {hovered && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background p-1 shadow-md">
          <select
            className="rounded border px-1 py-0.5 text-xs"
            value={size}
            disabled={pending}
            onChange={(e) => handleSizeChange(e.target.value as WidgetSize)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={pending}
            onClick={handleRemove}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
