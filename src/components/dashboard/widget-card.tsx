"use client";

import { useState } from "react";
import type { DashboardWidget } from "@/types";
import { Button } from "@/components/ui/button";
import { removeWidget, updateWidgetSize } from "@/lib/actions/dashboard";

import { AttendanceTodayWidget } from "./widgets/attendance-today";
import { LateCountMonthWidget } from "./widgets/late-count-month";
import { OvertimeMonthWidget } from "./widgets/overtime-month";
import { MyTasksSummaryWidget } from "./widgets/my-tasks-summary";
import { OverdueTasksWidget } from "./widgets/overdue-tasks";
import { TimesheetWeekWidget } from "./widgets/timesheet-week";
import { PendingApprovalsWidget } from "./widgets/pending-approvals";
import { PendingFormsWidget } from "./widgets/pending-forms";
import { LeaveBalancesWidget } from "./widgets/leave-balances";
import { UpcomingLeavesWidget } from "./widgets/upcoming-leaves";
import { PayrollSummaryWidget } from "./widgets/payroll-summary";
import { AttendanceRateMonthWidget } from "./widgets/attendance-rate-month";
import { LeaveUsageTypeWidget } from "./widgets/leave-usage-type";
import { TaskCompletionRateWidget } from "./widgets/task-completion-rate";
import { TeamTaskProgressWidget } from "./widgets/team-task-progress";
import { HeadcountDepartmentWidget } from "./widgets/headcount-department";
import { AttendanceTrendWidget } from "./widgets/attendance-trend";
import { PayrollCostTrendWidget } from "./widgets/payroll-cost-trend";
import { DepartmentComparisonWidget } from "./widgets/department-comparison";

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

  switch (type) {
    case "attendance_today":
      return <AttendanceTodayWidget data={data} />;
    case "late_count_month":
      return <LateCountMonthWidget data={data} />;
    case "overtime_month":
      return <OvertimeMonthWidget data={data} />;
    case "my_tasks_summary":
      return <MyTasksSummaryWidget data={data} />;
    case "overdue_tasks":
      return <OverdueTasksWidget data={data} />;
    case "timesheet_week":
      return <TimesheetWeekWidget data={data} />;
    case "pending_approvals":
      return <PendingApprovalsWidget data={data} />;
    case "pending_forms":
      return <PendingFormsWidget data={data} />;
    case "leave_balances":
      return <LeaveBalancesWidget data={data} />;
    case "upcoming_leaves":
      return <UpcomingLeavesWidget data={data} />;
    case "payroll_summary":
      return <PayrollSummaryWidget data={data} />;
    case "attendance_rate_month":
      return <AttendanceRateMonthWidget data={data} />;
    case "leave_usage_type":
      return <LeaveUsageTypeWidget data={data} />;
    case "task_completion_rate":
      return <TaskCompletionRateWidget data={data} />;
    case "team_task_progress":
      return <TeamTaskProgressWidget data={data} />;
    case "headcount_department":
      return <HeadcountDepartmentWidget data={data} />;
    case "attendance_trend":
      return <AttendanceTrendWidget data={data} />;
    case "payroll_cost_trend":
      return <PayrollCostTrendWidget data={data} />;
    case "department_comparison":
      return <DepartmentComparisonWidget data={data} />;
    default:
      return <div className="text-sm text-muted-foreground p-4">Unknown widget type.</div>;
  }
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
