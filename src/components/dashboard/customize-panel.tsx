"use client";

import { useState, useTransition } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  addWidget,
  removeWidget,
  updateWidgetSize,
  updateWidgetPosition,
} from "@/lib/actions/dashboard";
import type { DashboardWidget } from "@/types";

type WidgetSize = "small" | "medium" | "large";

type WidgetTypeDef = {
  type: string;
  label: string;
  size: WidgetSize;
};

export const WIDGET_TYPES: WidgetTypeDef[] = [
  { type: "attendance_today", label: "Attendance Today", size: "small" },
  { type: "late_count_month", label: "Late Count This Month", size: "small" },
  { type: "overtime_month", label: "Overtime This Month", size: "small" },
  { type: "my_tasks_summary", label: "My Tasks", size: "small" },
  { type: "overdue_tasks", label: "Overdue Tasks", size: "small" },
  { type: "timesheet_week", label: "Timesheet This Week", size: "small" },
  { type: "pending_approvals", label: "Pending Approvals", size: "small" },
  { type: "pending_forms", label: "Pending Forms", size: "small" },
  { type: "leave_balances", label: "Leave Balances", size: "medium" },
  { type: "upcoming_leaves", label: "Upcoming Leaves", size: "medium" },
  { type: "payroll_summary", label: "Latest Payroll", size: "medium" },
  { type: "attendance_rate_month", label: "Monthly Attendance Rate", size: "medium" },
  { type: "leave_usage_type", label: "Leave Usage by Type", size: "medium" },
  { type: "task_completion_rate", label: "Task Completion Rate", size: "medium" },
  { type: "team_task_progress", label: "Team Task Progress", size: "medium" },
  { type: "headcount_department", label: "Headcount by Dept", size: "medium" },
  { type: "attendance_trend", label: "Attendance Trend", size: "large" },
  { type: "payroll_cost_trend", label: "Payroll Cost Trend", size: "large" },
  { type: "department_comparison", label: "Department Comparison", size: "large" },
  { type: "out_of_office", label: "Out of Office (Leaves + Holidays)", size: "medium" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  widgets: DashboardWidget[];
};

export function CustomizePanel({ open, onClose, widgets }: Props) {
  const [isPending, startTransition] = useTransition();
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets);

  const addedTypes = new Set(localWidgets.map((w) => w.widget_type));
  const availableTypes = WIDGET_TYPES.filter((wt) => !addedTypes.has(wt.type));

  function handleAdd(wt: WidgetTypeDef) {
    startTransition(async () => {
      await addWidget(wt.type, wt.size);
    });
  }

  function handleRemove(widgetId: string) {
    setLocalWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    startTransition(async () => {
      await removeWidget(widgetId);
    });
  }

  function handleSizeChange(widgetId: string, newSize: WidgetSize) {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, size: newSize } : w))
    );
    startTransition(async () => {
      await updateWidgetSize(widgetId, newSize);
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...localWidgets];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setLocalWidgets(updated);
    startTransition(async () => {
      await updateWidgetPosition(updated[index - 1].id, index - 1);
      await updateWidgetPosition(updated[index].id, index);
    });
  }

  function handleMoveDown(index: number) {
    if (index === localWidgets.length - 1) return;
    const updated = [...localWidgets];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setLocalWidgets(updated);
    startTransition(async () => {
      await updateWidgetPosition(updated[index].id, index);
      await updateWidgetPosition(updated[index + 1].id, index + 1);
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Active Widgets</p>
          {localWidgets.length === 0 && (
            <p className="text-sm text-muted-foreground">No widgets added yet.</p>
          )}
          {localWidgets.map((w, i) => {
            const meta = WIDGET_TYPES.find((wt) => wt.type === w.widget_type);
            return (
              <div key={w.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="font-medium">{meta?.label ?? w.widget_type}</span>
                  <select
                    className="w-24 rounded border px-1 py-0.5 text-xs"
                    value={w.size}
                    disabled={isPending}
                    onChange={(e) => handleSizeChange(w.id, e.target.value as WidgetSize)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    disabled={isPending || i === 0}
                    onClick={() => handleMoveUp(i)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    disabled={isPending || i === localWidgets.length - 1}
                    onClick={() => handleMoveDown(i)}
                  >
                    ↓
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={isPending}
                  onClick={() => handleRemove(w.id)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Add Widgets</p>
          {availableTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">All widgets are active.</p>
          )}
          {availableTypes.map((wt) => (
            <button
              key={wt.type}
              className="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
              disabled={isPending}
              onClick={() => handleAdd(wt)}
            >
              <span className="font-medium">{wt.label}</span>
              <span className="ml-2 text-xs capitalize text-muted-foreground">({wt.size})</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
