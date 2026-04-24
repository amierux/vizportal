"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = { data: any | null };

export function TimesheetAnalytics({ data }: Props) {
  if (!data) return null;
  const deptUtil = Array.isArray(data.dept_utilization) ? data.dept_utilization : [];

  return (
    <AnalyticsPanel title="Timesheet Analytics" storageKey="timesheet">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Submission Rate" value={Number(data.submission_rate ?? 0)} suffix="%" decimals={1} accentColor="var(--color-chart-1)" />
        <KpiCard label="Avg Hours" value={Number(data.avg_hours ?? 0)} suffix="h" decimals={1} accentColor="var(--color-chart-2)" />
        <KpiCard label="Overtime Flags" value={data.overtime_flags ?? 0} accentColor="var(--color-chart-3)" />
        <KpiCard label="Non-Submitters" value={data.non_submitters ?? 0} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      {deptUtil.length > 0 && (
        <div className="mt-4">
          <ComparisonBar data={deptUtil} bars={[{ dataKey: "avg_hours", color: "var(--color-chart-1)" }]} xAxisKey="name" title="Avg Hours by Department" />
        </div>
      )}
    </AnalyticsPanel>
  );
}
