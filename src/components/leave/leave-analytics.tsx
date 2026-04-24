"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { DistributionChart } from "@/components/analytics/distribution-chart";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
};

export function LeaveAnalytics({ data }: Props) {
  if (!data) return null;

  const usageByType = Array.isArray(data.usage_by_type)
    ? data.usage_by_type.map((t: any) => ({ name: t.name, value: Number(t.days) }))
    : [];

  return (
    <AnalyticsPanel title="Leave Analytics" storageKey="leave">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Days Used This Month" value={Number(data.days_used ?? 0)} decimals={1} accentColor="var(--color-chart-1)" />
        <KpiCard label="Pending Requests" value={data.pending_count ?? 0} accentColor="var(--color-chart-2)" />
        <KpiCard label="Utilization %" value={Number(data.utilization_pct ?? 0)} suffix="%" decimals={1} accentColor="var(--color-chart-3)" />
        <KpiCard label="Remaining Balance" value={Number(data.total_remaining ?? 0)} suffix=" days" decimals={1} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      {usageByType.length > 0 && (
        <div className="mt-4">
          <DistributionChart data={usageByType} title="Leave Usage by Type" />
        </div>
      )}
    </AnalyticsPanel>
  );
}
