"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { TrendChart } from "@/components/analytics/trend-chart";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = { data: any | null };

export function PayrollAnalytics({ data }: Props) {
  if (!data) return null;
  const periodTrend = Array.isArray(data.period_trend) ? data.period_trend : [];
  const deptCosts = Array.isArray(data.dept_costs) ? data.dept_costs : [];

  return (
    <AnalyticsPanel title="Payroll Analytics" storageKey="payroll">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Total Gross" value={Number(data.total_gross ?? 0)} prefix="₱" formatFn={(v) => v.toLocaleString("en-PH", { maximumFractionDigits: 0 })} accentColor="var(--color-chart-1)" />
        <KpiCard label="Total Net" value={Number(data.total_net ?? 0)} prefix="₱" formatFn={(v) => v.toLocaleString("en-PH", { maximumFractionDigits: 0 })} accentColor="var(--color-chart-2)" />
        <KpiCard label="Total Deductions" value={Number(data.total_deductions ?? 0)} prefix="₱" formatFn={(v) => v.toLocaleString("en-PH", { maximumFractionDigits: 0 })} accentColor="var(--color-chart-3)" />
        <KpiCard label="Avg Salary" value={Number(data.avg_salary ?? 0)} prefix="₱" formatFn={(v) => v.toLocaleString("en-PH", { maximumFractionDigits: 0 })} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {periodTrend.length > 0 && <TrendChart data={periodTrend} dataKey="net" xAxisKey="period" title="Payroll Cost Trend" type="area" />}
        {deptCosts.length > 0 && <ComparisonBar data={deptCosts} bars={[{ dataKey: "net_pay", color: "var(--color-chart-1)" }]} xAxisKey="department" title="Cost by Department" layout="horizontal" />}
      </div>
    </AnalyticsPanel>
  );
}
