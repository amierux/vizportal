"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";
import { DistributionChart } from "@/components/analytics/distribution-chart";

type Props = { data: any | null };

export function EmployeeAnalytics({ data }: Props) {
  if (!data) return null;
  const deptBreakdown = Array.isArray(data.dept_breakdown) ? data.dept_breakdown : [];
  const statusBreakdown = Array.isArray(data.status_breakdown) ? data.status_breakdown.map((s: any) => ({ name: s.status, value: Number(s.count) })) : [];

  return (
    <AnalyticsPanel title="Employee Analytics" storageKey="employees">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Total Headcount" value={data.headcount ?? 0} accentColor="var(--color-chart-1)" />
        <KpiCard label="New Hires This Month" value={data.new_hires_month ?? 0} accentColor="var(--color-chart-2)" />
        <KpiCard label="Probationary" value={data.probationary_count ?? 0} accentColor="var(--color-chart-3)" />
        <KpiCard label="Avg Tenure" value={Number(data.avg_tenure_years ?? 0)} suffix=" yrs" decimals={1} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {deptBreakdown.length > 0 && <ComparisonBar data={deptBreakdown} bars={[{ dataKey: "count", color: "var(--color-chart-1)" }]} xAxisKey="name" title="Headcount by Department" />}
        {statusBreakdown.length > 0 && <DistributionChart data={statusBreakdown} title="Employment Status" />}
      </div>
    </AnalyticsPanel>
  );
}
