"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = { data: any | null };

export function ApprovalAnalytics({ data }: Props) {
  if (!data) return null;
  const bottlenecks = Array.isArray(data.bottlenecks) ? data.bottlenecks : [];

  return (
    <AnalyticsPanel title="Approval Analytics" storageKey="approvals">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Pending" value={data.pending_count ?? 0} accentColor="var(--color-chart-1)" />
        <KpiCard label="Avg Resolution Time" value={Number(data.avg_hours_to_resolve ?? 0)} suffix="h" decimals={1} accentColor="var(--color-chart-2)" />
        <KpiCard label="Approved" value={data.approved_count ?? 0} accentColor="var(--color-chart-3)" />
        <KpiCard label="Rejected" value={data.rejected_count ?? 0} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      {bottlenecks.length > 0 && (
        <div className="mt-4">
          <ComparisonBar data={bottlenecks} bars={[{ dataKey: "pending", color: "var(--color-chart-2)" }]} xAxisKey="name" title="Pending by Approver" layout="horizontal" />
        </div>
      )}
    </AnalyticsPanel>
  );
}
