"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = { data: any | null };

export function FormAnalytics({ data }: Props) {
  if (!data) return null;
  const perForm = Array.isArray(data.per_form) ? data.per_form : [];

  return (
    <AnalyticsPanel title="Form Analytics" storageKey="forms">
      <AnalyticsGrid columns={3}>
        <KpiCard label="Active Forms" value={data.active_count ?? 0} accentColor="var(--color-chart-1)" />
        <KpiCard label="Pending Submissions" value={Number(data.total_pending ?? 0)} accentColor="var(--color-chart-2)" />
        <KpiCard label="Response Rate" value={Number(data.response_rate ?? 0)} suffix="%" decimals={1} accentColor="var(--color-chart-3)" />
      </AnalyticsGrid>
      {perForm.length > 0 && (
        <div className="mt-4">
          <ComparisonBar data={perForm} bars={[{ dataKey: "rate", color: "var(--color-chart-1)" }]} xAxisKey="title" title="Submission Rate by Form" layout="horizontal" />
        </div>
      )}
    </AnalyticsPanel>
  );
}
