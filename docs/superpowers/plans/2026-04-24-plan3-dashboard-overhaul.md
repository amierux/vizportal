# Plan 3: Dashboard Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dashboard from a basic widget grid into a modern analytics hub with hero metrics strip, glassmorphism widgets, animated charts, export system, and role-aware layout presets.

**Architecture:** Add a hero metrics strip above the widget grid (role-aware KPI cards), upgrade all 20 widgets to use glassmorphism cards with chart animations, add per-widget and full-dashboard export (CSV/PDF), upgrade the customization panel with layout presets, and wrap everything in Framer Motion stagger animations.

**Tech Stack:** Framer Motion 12, Recharts 3, shadcn/ui, Tailwind CSS 4, jsPDF + html2canvas

---

## File Structure

### New Files
```
src/components/dashboard/hero-metrics.tsx       — Top KPI strip (role-aware, 4-6 cards)
src/components/dashboard/dashboard-export.tsx    — Full dashboard PDF/CSV export button
```

### Modified Files
```
src/app/(portal)/dashboard/page.tsx              — Add hero metrics data fetching, pass to new components
src/components/dashboard/dashboard-grid.tsx       — Stagger animations, integrate hero metrics + export
src/components/dashboard/widget-card.tsx          — Glassmorphism styling, export menu per widget, animations
src/components/dashboard/customize-panel.tsx      — Layout presets, widget previews
src/components/dashboard/widgets/*.tsx            — All 20 widgets: glassmorphism cards, chart animations
```

---

### Task 1: Hero Metrics Component

**Files:**
- Create: `src/components/dashboard/hero-metrics.tsx`

- [ ] **Step 1: Create the hero metrics component**

```typescript
"use client";

import { AnalyticsGrid } from "@/components/analytics/analytics-grid";
import { KpiCard } from "@/components/analytics/kpi-card";
import type { RoleName } from "@/types";

type HeroMetricsProps = {
  roles: RoleName[];
  data: {
    // Personal metrics (all roles)
    hoursToday?: number;
    leaveBalance?: number;
    myTasksDone?: number;
    myTasksTotal?: number;
    pendingActions?: number;
    // Admin/manager metrics
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
        <KpiCard
          label="Present Today"
          value={data.presentToday ?? 0}
          suffix={data.presentPercent ? ` (${data.presentPercent}%)` : ""}
          accentColor="var(--color-chart-1)"
        />
        <KpiCard
          label="Pending Approvals"
          value={data.pendingApprovals ?? 0}
          accentColor="var(--color-chart-2)"
        />
        <KpiCard
          label="Payroll This Period"
          value={data.payrollThisPeriod ?? 0}
          prefix="₱"
          formatFn={(v) => v.toLocaleString("en-PH", { maximumFractionDigits: 0 })}
          accentColor="var(--color-chart-3)"
        />
        <KpiCard
          label="Open Tasks"
          value={data.openTasks ?? 0}
          trend={data.overduePercent ? { value: -(data.overduePercent), label: "overdue" } : undefined}
          accentColor="var(--color-chart-4)"
        />
      </AnalyticsGrid>
    );
  }

  return (
    <AnalyticsGrid columns={4}>
      <KpiCard
        label="Hours Today"
        value={data.hoursToday ?? 0}
        decimals={1}
        suffix="h"
        accentColor="var(--color-chart-1)"
      />
      <KpiCard
        label="Leave Balance"
        value={data.leaveBalance ?? 0}
        suffix=" days"
        accentColor="var(--color-chart-2)"
      />
      <KpiCard
        label="Tasks Done"
        value={data.myTasksDone ?? 0}
        suffix={data.myTasksTotal ? ` / ${data.myTasksTotal}` : ""}
        accentColor="var(--color-chart-3)"
      />
      <KpiCard
        label="Pending Actions"
        value={data.pendingActions ?? 0}
        accentColor="var(--color-chart-4)"
      />
    </AnalyticsGrid>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/hero-metrics.tsx && git commit -m "feat: add HeroMetrics component with role-aware KPI cards"
```

---

### Task 2: Dashboard Export Component

**Files:**
- Create: `src/components/dashboard/dashboard-export.tsx`

- [ ] **Step 1: Create the dashboard export component**

```typescript
"use client";

import { useRef, useCallback } from "react";
import { ExportMenu } from "@/components/shared/export-menu";
import { downloadElementAsPdf } from "@/lib/utils/export-pdf";
import { generateCsv, downloadCsv } from "@/lib/utils/export-csv";

type DashboardExportProps = {
  dashboardRef: React.RefObject<HTMLDivElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgetData: Record<string, any>;
};

export function DashboardExport({ dashboardRef, widgetData }: DashboardExportProps) {
  const handlePdf = useCallback(async () => {
    if (!dashboardRef.current) return;
    await downloadElementAsPdf(dashboardRef.current, "dashboard-report", {
      title: "VizPortal Dashboard Report",
      orientation: "landscape",
    });
  }, [dashboardRef]);

  const handleCsv = useCallback(() => {
    const allData: Record<string, unknown>[] = [];
    for (const [type, data] of Object.entries(widgetData)) {
      if (!data) continue;
      if (Array.isArray(data)) {
        data.forEach((item) => allData.push({ widget: type, ...item }));
      } else if (typeof data === "object") {
        allData.push({ widget: type, ...data });
      }
    }
    if (allData.length === 0) return;
    const csv = generateCsv(allData);
    downloadCsv(csv, "dashboard-data");
  }, [widgetData]);

  return <ExportMenu onExportPdf={handlePdf} onExportCsv={handleCsv} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/dashboard-export.tsx && git commit -m "feat: add DashboardExport component for PDF/CSV export"
```

---

### Task 3: Upgrade Dashboard Page — Hero Metrics Data

**Files:**
- Modify: `src/app/(portal)/dashboard/page.tsx`

- [ ] **Step 1: Add hero metrics data fetching**

The page needs to compute hero metrics from the widget data that's already being fetched. Add a `buildHeroData` function and pass roles + hero data to the grid.

Read the current `src/app/(portal)/dashboard/page.tsx` first. Then modify it to:

1. Import `getUserRoles` (already imported) — keep as-is
2. After `widgetData` is built, compute hero metrics from it:

```typescript
  // Build hero metrics from widget data
  const heroData = {
    // Personal
    hoursToday: (widgetData.attendance_today as any)?.myStatus === "present" ? 8 : 0,
    leaveBalance: Array.isArray(widgetData.leave_balances)
      ? (widgetData.leave_balances as any[]).reduce((sum: number, b: any) => sum + (b.remaining_days ?? 0), 0)
      : 0,
    myTasksDone: (widgetData.my_tasks_summary as any)?.done ?? 0,
    myTasksTotal:
      ((widgetData.my_tasks_summary as any)?.todo ?? 0) +
      ((widgetData.my_tasks_summary as any)?.inProgress ?? 0) +
      ((widgetData.my_tasks_summary as any)?.done ?? 0),
    pendingActions:
      ((widgetData.pending_approvals as any)?.count ?? 0) +
      ((widgetData.pending_forms as any)?.count ?? 0),
    // Admin
    presentToday:
      ((widgetData.attendance_today as any)?.companyPresent ?? 0) +
      ((widgetData.attendance_today as any)?.companyLate ?? 0),
    presentPercent: (() => {
      const att = widgetData.attendance_today as any;
      if (!att) return 0;
      const total = (att.companyPresent ?? 0) + (att.companyLate ?? 0) + (att.companyAbsent ?? 0);
      return total > 0 ? Math.round(((att.companyPresent + att.companyLate) / total) * 100) : 0;
    })(),
    pendingApprovals: (widgetData.pending_approvals as any)?.count ?? 0,
    payrollThisPeriod: (widgetData.payroll_summary as any)?.netPay ?? 0,
    openTasks: (widgetData.task_completion_rate as any)?.pending ?? 0,
    overduePercent: (() => {
      const tc = widgetData.task_completion_rate as any;
      if (!tc || !tc.pending) return 0;
      const overdue = (widgetData.overdue_tasks as any)?.count ?? 0;
      return tc.pending > 0 ? Math.round((overdue / tc.pending) * 100) : 0;
    })(),
  };
```

3. Update the JSX to pass `roles`, `heroData`, and `widgetData` to `DashboardGrid`:

```tsx
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your personalized overview</p>
        </div>
      </div>
      <DashboardGrid
        widgets={widgets}
        widgetData={widgetData}
        roles={roles}
        heroData={heroData}
      />
    </div>
  );
```

Remove the old `animate-fade-in-up` class — the grid will handle its own animations now.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(portal)/dashboard/page.tsx" && git commit -m "feat: add hero metrics data computation to dashboard page"
```

---

### Task 4: Upgrade Dashboard Grid — Animations, Hero Metrics, Export

**Files:**
- Modify: `src/components/dashboard/dashboard-grid.tsx`

- [ ] **Step 1: Rewrite the grid component**

Replace the entire file with:

```typescript
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { DashboardWidget, RoleName } from "@/types";
import { WidgetCard } from "./widget-card";
import { CustomizePanel } from "./customize-panel";
import { HeroMetrics } from "./hero-metrics";
import { DashboardExport } from "./dashboard-export";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTransition } from "@/components/shared/page-transition";
import { staggerContainer, fadeInUp } from "@/lib/animations/stagger-variants";
import { LayoutGrid } from "lucide-react";

type Props = {
  widgets: DashboardWidget[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgetData: Record<string, any>;
  roles: RoleName[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  heroData: Record<string, any>;
};

export function DashboardGrid({ widgets, widgetData, roles, heroData }: Props) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  return (
    <PageTransition>
      <div ref={dashboardRef} className="space-y-6">
        {/* Hero Metrics Strip */}
        <HeroMetrics roles={roles} data={heroData} />

        {/* Controls Bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {widgets.length} widget{widgets.length !== 1 ? "s" : ""} active
          </p>
          <div className="flex items-center gap-2">
            <DashboardExport dashboardRef={dashboardRef} widgetData={widgetData} />
            <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Customize
            </Button>
          </div>
        </div>

        {/* Widget Grid */}
        {widgets.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-10 w-10" />}
            title="No widgets yet"
            description="Add widgets to build your personalized dashboard."
            action={{ label: "Customize Dashboard", onClick: () => setCustomizeOpen(true) }}
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {widgets.map((widget) => (
              <motion.div key={widget.id} variants={fadeInUp}>
                <WidgetCard
                  widget={widget}
                  data={widgetData[widget.widget_type]}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <CustomizePanel
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        widgets={widgets}
      />
    </PageTransition>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/dashboard-grid.tsx && git commit -m "feat: upgrade dashboard grid with hero metrics, export, stagger animations, empty state"
```

---

### Task 5: Upgrade Widget Card — Glassmorphism + Per-Widget Export

**Files:**
- Modify: `src/components/dashboard/widget-card.tsx`

- [ ] **Step 1: Upgrade widget card with glassmorphism and export**

Read the current file first (it has dynamic imports already). Add glassmorphism styling, per-widget export menu, and a more refined hover overlay.

Key changes:
1. Replace the plain `div` wrapper with glassmorphism styling
2. Replace the hover overlay with a cleaner "..." menu button
3. Add per-widget CSV export option

Replace the `WidgetCard` component (keep the `widgetComponents` map and `renderWidget` function):

```typescript
export function WidgetCard({ widget, data }: Props) {
  const [hovered, setHovered] = useState(false);
  const [pending, setPending] = useState(false);

  const size = widget.size as WidgetSize;

  async function handleRemove() {
    setPending(true);
    await removeWidget(widget.id);
    setPending(false);
  }

  async function handleSizeChange(newSize: WidgetSize) {
    setPending(true);
    await updateWidgetSize(widget.id, newSize);
    setPending(false);
  }

  return (
    <div
      className={`relative ${sizeClass(size)} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="glass-surface rounded-xl transition-shadow duration-200 hover:shadow-lg">
        {renderWidget(widget.widget_type, data)}
      </div>

      {hovered && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg glass-floating p-1">
          <select
            className="rounded border-none bg-transparent px-1 py-0.5 text-xs focus:outline-none"
            value={size}
            disabled={pending}
            onChange={(e) => handleSizeChange(e.target.value as WidgetSize)}
          >
            <option value="small">S</option>
            <option value="medium">M</option>
            <option value="large">L</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10"
            disabled={pending}
            onClick={handleRemove}
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/widget-card.tsx && git commit -m "feat: upgrade widget card with glassmorphism styling and refined controls"
```

---

### Task 6: Upgrade All 20 Widget Components — Glassmorphism + Chart Animations

**Files:**
- Modify: All 20 files in `src/components/dashboard/widgets/`

This is the largest task. Each widget needs:
1. Remove the `Card` import and wrapper — the parent `WidgetCard` now provides glassmorphism
2. Replace `Card`/`CardHeader`/`CardContent` with plain divs + consistent padding
3. For chart widgets: ensure `animationDuration` and `animationEasing` are set
4. For number widgets: use the animated styling pattern

**Pattern for simple number widgets** (late-count, overtime-month, overdue-tasks, pending-approvals, pending-forms):
```typescript
export function XxxWidget({ data }: { data: { count: number } }) {
  return (
    <div className="p-4">
      <p className="text-sm font-medium text-muted-foreground">Widget Title</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{data.count}</p>
    </div>
  );
}
```

**Pattern for chart widgets** (attendance-trend, payroll-cost-trend, department-comparison, etc.):
Keep the Recharts components but ensure they have:
- `animationDuration={1200}`
- `animationEasing="ease-out"`
- Remove hardcoded colors, use CSS variables where possible

**Pattern for list/card widgets** (leave-balances, upcoming-leaves, out-of-office, etc.):
Keep the list structure but remove the outer `Card` wrapper.

For each of the 20 widgets:
1. Read the current file
2. Remove `Card`/`CardHeader`/`CardContent`/`CardTitle` imports
3. Replace the outer `<Card className="card-hover">` with `<div>`
4. Replace `<CardHeader>/<CardTitle>` with a plain `<p>` title
5. Replace `<CardContent>` with a plain `<div>`
6. Keep all business logic and data rendering unchanged

- [ ] **Step 1-20: Update each widget file** (batch — update all 20 at once)

- [ ] **Step 21: Commit**

```bash
git add src/components/dashboard/widgets/ && git commit -m "feat: strip Card wrappers from all 20 widgets, parent provides glassmorphism"
```

---

### Task 7: Build Verification

- [ ] **Step 1: TypeScript check**
```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npx tsc --noEmit 2>&1
```

- [ ] **Step 2: Lint**
```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run lint 2>&1
```

- [ ] **Step 3: Tests**
```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm test 2>&1
```

- [ ] **Step 4: Commit fixes if needed**
```bash
git add -A && git commit -m "fix: resolve build issues from dashboard overhaul"
```
