"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { TrendChart } from "@/components/analytics/trend-chart";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
};

export function AttendanceAnalytics({ data }: Props) {
  if (!data) return null;

  const totalToday = (data.present_today ?? 0) + (data.late_today ?? 0) + (data.absent_today ?? 0);

  return (
    <AnalyticsPanel title="Attendance Analytics" storageKey="attendance">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Present Today" value={data.present_today ?? 0} suffix={totalToday > 0 ? ` / ${totalToday}` : ""} accentColor="var(--color-chart-1)" />
        <KpiCard label="Late % This Month" value={data.attendance_rate ? 100 - Number(data.attendance_rate) : 0} suffix="%" decimals={1} accentColor="var(--color-chart-2)" />
        <KpiCard label="Attendance Rate" value={Number(data.attendance_rate ?? 0)} suffix="%" decimals={1} accentColor="var(--color-chart-3)" />
        <KpiCard label="Absent Today" value={data.absent_today ?? 0} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.isArray(data.daily_trend) && data.daily_trend.length > 0 && (
          <TrendChart data={data.daily_trend} dataKey="rate" xAxisKey="date" title="Daily Attendance Rate" type="area" />
        )}
        {Array.isArray(data.dept_breakdown) && data.dept_breakdown.length > 0 && (
          <ComparisonBar data={data.dept_breakdown} bars={[{ dataKey: "attendance_rate", color: "var(--color-chart-1)", label: "Attendance %" }, { dataKey: "late_rate", color: "var(--color-chart-2)", label: "Late %" }]} xAxisKey="department" title="Department Breakdown" />
        )}
      </div>
    </AnalyticsPanel>
  );
}
