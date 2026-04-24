"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { TrendChart } from "@/components/analytics/trend-chart";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = { data: any | null };

export function OvertimeAnalytics({ data }: Props) {
  if (!data) return null;
  const monthlyTrend = Array.isArray(data.monthly_trend) ? data.monthly_trend : [];
  const deptDist = Array.isArray(data.dept_distribution) ? data.dept_distribution : [];

  return (
    <AnalyticsPanel title="Overtime Analytics" storageKey="overtime">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Total OT Hours" value={Number(data.total_hours ?? 0)} suffix="h" decimals={1} accentColor="var(--color-chart-1)" />
        <KpiCard label="Total Requests" value={data.total_requests ?? 0} accentColor="var(--color-chart-2)" />
        <KpiCard label="Approval Rate" value={Number(data.approval_rate ?? 0)} suffix="%" decimals={1} accentColor="var(--color-chart-3)" />
        <KpiCard label="Top Department" value={0} suffix={` ${data.top_department ?? "N/A"}`} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {monthlyTrend.length > 0 && <TrendChart data={monthlyTrend} dataKey="hours" xAxisKey="month" title="Monthly OT Trend" type="area" />}
        {deptDist.length > 0 && <ComparisonBar data={deptDist} bars={[{ dataKey: "hours", color: "var(--color-chart-1)" }]} xAxisKey="name" title="OT by Department" layout="horizontal" />}
      </div>
    </AnalyticsPanel>
  );
}
