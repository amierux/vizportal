# Plan 4: Per-Page Analytics Rollout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible analytics panels with KPI cards and charts to every module page. Admins/managers see team-wide analytics; regular members see personal stats.

**Architecture:** Each page imports the relevant `fetchXxxAnalytics()` function from `src/lib/actions/analytics.ts` (built in Plan 1) and passes the data to a new client component (`XxxAnalytics`) that uses the analytics components (built in Plan 2: AnalyticsPanel, KpiCard, AnalyticsGrid, TrendChart, etc.). The analytics data is fetched server-side in the page component and passed as props — no client-side fetching.

**Tech Stack:** Existing analytics components from Plan 2, RPC functions from Plan 1

---

## File Structure

### New Files (one analytics client component per module)
```
src/components/attendance/attendance-analytics.tsx
src/components/leave/leave-analytics.tsx
src/components/payroll/payroll-analytics.tsx
src/components/employees/employee-analytics.tsx
src/components/workspace/workspace-analytics.tsx
src/components/timesheet/timesheet-analytics.tsx
src/components/overtime/overtime-analytics.tsx
src/components/approvals/approval-analytics.tsx
src/components/forms/form-analytics.tsx
```

### Modified Files (inject analytics into pages)
```
src/app/(portal)/attendance/manage/page.tsx
src/app/(portal)/leave/manage/page.tsx
src/app/(portal)/payroll/page.tsx
src/app/(portal)/employees/page.tsx
src/app/(portal)/workspace/page.tsx
src/app/(portal)/timesheet/page.tsx
src/app/(portal)/overtime/page.tsx
src/app/(portal)/approvals/page.tsx
src/app/(portal)/forms/page.tsx
```

---

### Common Pattern

Every analytics component follows the same pattern:

```typescript
// Client component that renders the analytics panel
"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { TrendChart } from "@/components/analytics/trend-chart";
// ... other chart imports as needed

type Props = {
  data: {
    // Module-specific analytics data from RPC function
  } | null;
};

export function XxxAnalytics({ data }: Props) {
  if (!data) return null; // Non-admin users get null

  return (
    <AnalyticsPanel title="Module Analytics" storageKey="module">
      <AnalyticsGrid columns={4}>
        <KpiCard label="..." value={...} />
        {/* More KPI cards */}
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart ... />
        {/* More charts */}
      </div>
    </AnalyticsPanel>
  );
}
```

Every page modification follows this pattern:

```typescript
// In the server page component, add:
import { fetchXxxAnalytics } from "@/lib/actions/analytics";
import { XxxAnalytics } from "@/components/xxx/xxx-analytics";

// In the data fetching section, add to existing Promise.all or after:
const analyticsData = await fetchXxxAnalytics();

// In the JSX, add between header and content:
<XxxAnalytics data={analyticsData} />
```

---

### Task 1: Attendance Analytics

**Files:**
- Create: `src/components/attendance/attendance-analytics.tsx`
- Modify: `src/app/(portal)/attendance/manage/page.tsx`

- [ ] **Step 1: Create attendance analytics component**

```typescript
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
        <KpiCard
          label="Present Today"
          value={data.present_today ?? 0}
          suffix={totalToday > 0 ? ` / ${totalToday}` : ""}
          accentColor="var(--color-chart-1)"
        />
        <KpiCard
          label="Late % This Month"
          value={data.attendance_rate ? 100 - Number(data.attendance_rate) : 0}
          suffix="%"
          decimals={1}
          accentColor="var(--color-chart-2)"
        />
        <KpiCard
          label="Attendance Rate"
          value={Number(data.attendance_rate ?? 0)}
          suffix="%"
          decimals={1}
          accentColor="var(--color-chart-3)"
        />
        <KpiCard
          label="Absent Today"
          value={data.absent_today ?? 0}
          accentColor="var(--color-chart-4)"
        />
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.isArray(data.daily_trend) && data.daily_trend.length > 0 && (
          <TrendChart
            data={data.daily_trend}
            dataKey="rate"
            xAxisKey="date"
            title="Daily Attendance Rate"
            type="area"
          />
        )}
        {Array.isArray(data.dept_breakdown) && data.dept_breakdown.length > 0 && (
          <ComparisonBar
            data={data.dept_breakdown}
            bars={[
              { dataKey: "attendance_rate", color: "var(--color-chart-1)", label: "Attendance %" },
              { dataKey: "late_rate", color: "var(--color-chart-2)", label: "Late %" },
            ]}
            xAxisKey="department"
            title="Department Breakdown"
          />
        )}
      </div>
    </AnalyticsPanel>
  );
}
```

- [ ] **Step 2: Modify attendance manage page**

Read `src/app/(portal)/attendance/manage/page.tsx`. Add:
1. Import `fetchAttendanceAnalytics` from `@/lib/actions/analytics`
2. Import `AttendanceAnalytics` from `@/components/attendance/attendance-analytics`
3. Add `const analyticsData = await fetchAttendanceAnalytics();` to the data fetching section
4. Add `<AttendanceAnalytics data={analyticsData} />` between the page header and the AttendanceTable

- [ ] **Step 3: Commit**

```bash
git add src/components/attendance/attendance-analytics.tsx "src/app/(portal)/attendance/manage/page.tsx" && git commit -m "feat: add attendance analytics panel to manage page"
```

---

### Task 2: Leave Analytics

**Files:**
- Create: `src/components/leave/leave-analytics.tsx`
- Modify: `src/app/(portal)/leave/manage/page.tsx`

- [ ] **Step 1: Create leave analytics component**

```typescript
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
```

- [ ] **Step 2: Modify leave manage page**

Read `src/app/(portal)/leave/manage/page.tsx`. Add analytics import + fetch + render between header and table.

- [ ] **Step 3: Commit**

```bash
git add src/components/leave/leave-analytics.tsx "src/app/(portal)/leave/manage/page.tsx" && git commit -m "feat: add leave analytics panel to manage page"
```

---

### Task 3: Payroll Analytics

**Files:**
- Create: `src/components/payroll/payroll-analytics.tsx`
- Modify: `src/app/(portal)/payroll/page.tsx`

- [ ] **Step 1: Create payroll analytics component**

```typescript
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
        {periodTrend.length > 0 && (
          <TrendChart data={periodTrend} dataKey="net" xAxisKey="period" title="Payroll Cost Trend" type="area" />
        )}
        {deptCosts.length > 0 && (
          <ComparisonBar data={deptCosts} bars={[{ dataKey: "net_pay", color: "var(--color-chart-1)" }]} xAxisKey="department" title="Cost by Department" layout="horizontal" />
        )}
      </div>
    </AnalyticsPanel>
  );
}
```

- [ ] **Step 2: Modify payroll page**

Read `src/app/(portal)/payroll/page.tsx`. Add analytics for admin-level users only (the page already checks `isAdminLevel`). Add analytics after the header, before the tabs.

- [ ] **Step 3: Commit**

```bash
git add src/components/payroll/payroll-analytics.tsx "src/app/(portal)/payroll/page.tsx" && git commit -m "feat: add payroll analytics panel to payroll page"
```

---

### Task 4: Employee Analytics

**Files:**
- Create: `src/components/employees/employee-analytics.tsx`
- Modify: `src/app/(portal)/employees/page.tsx`

- [ ] **Step 1: Create employee analytics component**

```typescript
"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";
import { DistributionChart } from "@/components/analytics/distribution-chart";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
};

export function EmployeeAnalytics({ data }: Props) {
  if (!data) return null;

  const deptBreakdown = Array.isArray(data.dept_breakdown) ? data.dept_breakdown : [];
  const statusBreakdown = Array.isArray(data.status_breakdown)
    ? data.status_breakdown.map((s: any) => ({ name: s.status, value: Number(s.count) }))
    : [];

  return (
    <AnalyticsPanel title="Employee Analytics" storageKey="employees">
      <AnalyticsGrid columns={4}>
        <KpiCard label="Total Headcount" value={data.headcount ?? 0} accentColor="var(--color-chart-1)" />
        <KpiCard label="New Hires This Month" value={data.new_hires_month ?? 0} accentColor="var(--color-chart-2)" />
        <KpiCard label="Probationary" value={data.probationary_count ?? 0} accentColor="var(--color-chart-3)" />
        <KpiCard label="Avg Tenure" value={Number(data.avg_tenure_years ?? 0)} suffix=" yrs" decimals={1} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {deptBreakdown.length > 0 && (
          <ComparisonBar data={deptBreakdown} bars={[{ dataKey: "count", color: "var(--color-chart-1)" }]} xAxisKey="name" title="Headcount by Department" />
        )}
        {statusBreakdown.length > 0 && (
          <DistributionChart data={statusBreakdown} title="Employment Status" />
        )}
      </div>
    </AnalyticsPanel>
  );
}
```

- [ ] **Step 2: Modify employees page**

Read `src/app/(portal)/employees/page.tsx`. Add analytics for admin-level users (the page checks `canSeeAllMembers`). Add after header, before tabs.

- [ ] **Step 3: Commit**

```bash
git add src/components/employees/employee-analytics.tsx "src/app/(portal)/employees/page.tsx" && git commit -m "feat: add employee analytics panel to employees page"
```

---

### Task 5: Workspace, Timesheet, Overtime Analytics

**Files:**
- Create: `src/components/workspace/workspace-analytics.tsx`
- Create: `src/components/timesheet/timesheet-analytics.tsx`
- Create: `src/components/overtime/overtime-analytics.tsx`
- Modify: `src/app/(portal)/workspace/page.tsx`
- Modify: `src/app/(portal)/timesheet/page.tsx`
- Modify: `src/app/(portal)/overtime/page.tsx`

- [ ] **Step 1: Create workspace analytics**

```typescript
"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
};

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
```

- [ ] **Step 2: Create timesheet analytics**

```typescript
"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
};

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
```

- [ ] **Step 3: Create overtime analytics**

```typescript
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
        <KpiCard label="Top Department" value={0} suffix={data.top_department ?? "N/A"} accentColor="var(--color-chart-4)" />
      </AnalyticsGrid>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {monthlyTrend.length > 0 && (
          <TrendChart data={monthlyTrend} dataKey="hours" xAxisKey="month" title="Monthly OT Trend" type="area" />
        )}
        {deptDist.length > 0 && (
          <ComparisonBar data={deptDist} bars={[{ dataKey: "hours", color: "var(--color-chart-1)" }]} xAxisKey="name" title="OT by Department" layout="horizontal" />
        )}
      </div>
    </AnalyticsPanel>
  );
}
```

- [ ] **Step 4: Modify all 3 pages**

For each page (workspace, timesheet, overtime):
1. Read the current page
2. Import the analytics function + component
3. Add `const analyticsData = await fetchXxxAnalytics();` 
4. Add `<XxxAnalytics data={analyticsData} />` between header and main content

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/workspace-analytics.tsx src/components/timesheet/timesheet-analytics.tsx src/components/overtime/overtime-analytics.tsx "src/app/(portal)/workspace/page.tsx" "src/app/(portal)/timesheet/page.tsx" "src/app/(portal)/overtime/page.tsx" && git commit -m "feat: add analytics panels to workspace, timesheet, and overtime pages"
```

---

### Task 6: Approvals and Forms Analytics

**Files:**
- Create: `src/components/approvals/approval-analytics.tsx`
- Create: `src/components/forms/form-analytics.tsx`
- Modify: `src/app/(portal)/approvals/page.tsx`
- Modify: `src/app/(portal)/forms/page.tsx`

- [ ] **Step 1: Create approval analytics**

```typescript
"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
};

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
```

- [ ] **Step 2: Create form analytics**

```typescript
"use client";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ComparisonBar } from "@/components/analytics/comparison-bar";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
};

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
```

- [ ] **Step 3: Modify both pages**

For each page (approvals, forms):
1. Read the current page
2. Import the analytics function + component
3. Add analytics data fetch + render

- [ ] **Step 4: Commit**

```bash
git add src/components/approvals/approval-analytics.tsx src/components/forms/form-analytics.tsx "src/app/(portal)/approvals/page.tsx" "src/app/(portal)/forms/page.tsx" && git commit -m "feat: add analytics panels to approvals and forms pages"
```

---

### Task 7: Build Verification

- [ ] **Step 1: TypeScript check**
```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npx tsc --noEmit 2>&1
```

- [ ] **Step 2: Tests**
```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm test 2>&1
```

- [ ] **Step 3: Commit fixes if needed**
```bash
git add -A && git commit -m "fix: resolve build issues from per-page analytics rollout"
```
