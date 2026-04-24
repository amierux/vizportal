"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = { data: any | null };

export function WorkspaceAnalytics({ data }: Props) {
  if (!data) return null;
  const workload = Array.isArray(data.workload) ? data.workload : [];

  return (
    <AnalyticsPanel title="Workspace Analytics" storageKey="workspace">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Completion Rate" value={Number(data.completion_rate ?? 0)} suffix="%" decimals={1} accentColor="var(--color-chart-1)" />
        <KpiCard label="Overdue Tasks" value={data.overdue ?? 0} accentColor="var(--color-chart-2)" />
        <KpiCard label="Total Tasks" value={data.total ?? 0} accentColor="var(--color-chart-3)" />
        <KpiCard label="Completed" value={data.completed ?? 0} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      {workload.length > 0 && (
        <div className="mt-4">
          <ComparisonBar data={workload} bars={[{ dataKey: "total", color: "var(--color-chart-1)" }, { dataKey: "completed", color: "var(--color-chart-3)" }]} xAxisKey="name" title="Workload per Member" layout="horizontal" />
        </div>
      )}
    </AnalyticsPanel>
  );
}
