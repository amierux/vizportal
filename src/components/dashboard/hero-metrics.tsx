"use client";

import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import type { RoleName } from "@/types";

type HeroMetricsProps = {
  roles: RoleName[];
  data: {
    hoursToday?: number;
    leaveBalance?: number;
    myTasksDone?: number;
    myTasksTotal?: number;
    pendingActions?: number;
    presentToday?: number;
    presentPercent?: number;
    pendingApprovals?: number;
    payrollThisPeriod?: number;
    openTasks?: number;
    overduePercent?: number;
  };
};

const ADMIN_ROLES: RoleName[] = ["admin", "hr", "director", "business_manager"];

function isAdmin(roles: RoleName[]) {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

export function HeroMetrics({ roles, data }: HeroMetricsProps) {
  if (isAdmin(roles)) {
    return (
      <AnalyticsGrid columns={4}>
        <KpiCard label="Present Today" value={data.presentToday ?? 0} suffix={data.presentPercent ? ` (${data.presentPercent}%)` : ""} accentColor="var(--color-chart-1)" />
        <KpiCard label="Pending Approvals" value={data.pendingApprovals ?? 0} accentColor="var(--color-chart-2)" />
        <KpiCard label="Payroll This Period" value={data.payrollThisPeriod ?? 0} prefix="₱" formatFn={(v) => v.toLocaleString("en-PH", { maximumFractionDigits: 0 })} accentColor="var(--color-chart-3)" />
        <KpiCard label="Open Tasks" value={data.openTasks ?? 0} trend={data.overduePercent ? { value: -(data.overduePercent), label: "overdue" } : undefined} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
    );
  }

  return (
    <AnalyticsGrid columns={4}>
      <KpiCard label="Hours Today" value={data.hoursToday ?? 0} decimals={1} suffix="h" accentColor="var(--color-chart-1)" />
      <KpiCard label="Leave Balance" value={data.leaveBalance ?? 0} suffix=" days" accentColor="var(--color-chart-2)" />
      <KpiCard label="Tasks Done" value={data.myTasksDone ?? 0} suffix={data.myTasksTotal ? ` / ${data.myTasksTotal}` : ""} accentColor="var(--color-chart-3)" />
      <KpiCard label="Pending Actions" value={data.pendingActions ?? 0} accentColor="var(--color-chart-4)" />
    </AnalyticsGrid>
  );
}
