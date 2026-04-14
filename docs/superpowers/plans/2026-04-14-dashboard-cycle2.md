# Dashboard/Analytics — Cycle 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a customizable widget-based dashboard with 19 pre-built widgets (data cards + charts), role-based defaults, add/remove/reorder/resize functionality, and chart rendering via recharts.

**Architecture:** Single `dashboard_widgets` table stores user's widget layout. Each widget type has a dedicated data-fetching server action and a render component. Dashboard page loads user's widget list, fetches data per widget in parallel, renders in a responsive grid. Customization panel lets users toggle widgets on/off and resize them.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth), Tailwind + shadcn/ui, recharts

**Spec:** `docs/superpowers/specs/2026-04-14-phase5-forms-dashboard-design.md` — Sections 8-10

---

## File Structure

```
vizportal/
├── supabase/migrations/
│   └── 00053_create_dashboard_widgets.sql
├── src/
│   ├── app/(portal)/
│   │   └── dashboard/page.tsx                        # MODIFY — replace with widget dashboard
│   ├── components/
│   │   └── dashboard/
│   │       ├── dashboard-grid.tsx                    # Main grid layout + customize panel
│   │       ├── widget-card.tsx                       # Generic widget wrapper
│   │       ├── customize-panel.tsx                   # Side panel for widget management
│   │       ├── widgets/
│   │       │   ├── attendance-today.tsx
│   │       │   ├── late-count-month.tsx
│   │       │   ├── overtime-month.tsx
│   │       │   ├── my-tasks-summary.tsx
│   │       │   ├── overdue-tasks.tsx
│   │       │   ├── timesheet-week.tsx
│   │       │   ├── pending-approvals.tsx
│   │       │   ├── pending-forms.tsx
│   │       │   ├── leave-balances.tsx
│   │       │   ├── upcoming-leaves.tsx
│   │       │   ├── payroll-summary.tsx
│   │       │   ├── attendance-rate-month.tsx         # Donut chart
│   │       │   ├── leave-usage-type.tsx              # Pie chart
│   │       │   ├── task-completion-rate.tsx           # Bar chart
│   │       │   ├── team-task-progress.tsx             # Bar chart
│   │       │   ├── headcount-department.tsx           # Bar chart
│   │       │   ├── attendance-trend.tsx               # Line chart
│   │       │   ├── payroll-cost-trend.tsx             # Line chart
│   │       │   └── department-comparison.tsx          # Grouped bar chart
│   ├── lib/
│   │   └── actions/
│   │       └── dashboard.ts                          # Widget CRUD + data fetching
│   └── types/
│       ├── database.ts                               # MODIFY
│       └── index.ts                                  # MODIFY
```

---

## Task 1: Database Migration + Types

**Files:** Create migration, update types

- [ ] **Step 1: Create migration 00053**

Create `vizportal/supabase/migrations/00053_create_dashboard_widgets.sql`:

```sql
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  widget_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  size TEXT CHECK (size IN ('small', 'medium', 'large')) DEFAULT 'small' NOT NULL,
  config JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_dashboard_widgets_profile ON dashboard_widgets(profile_id);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own widgets"
  ON dashboard_widgets FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own widgets"
  ON dashboard_widgets FOR ALL
  USING (profile_id = auth.uid());
```

- [ ] **Step 2: Add type to database.ts + index.ts**

DashboardWidget: id, profile_id, company_id, widget_type, position (number), size ('small'|'medium'|'large'), config (unknown), created_at

- [ ] **Step 3: Push migration + commit**

---

## Task 2: Dashboard Server Actions

**Files:** Create `src/lib/actions/dashboard.ts`

Widget CRUD:
- `getMyWidgets()` — user's widgets ordered by position
- `addWidget(widgetType, size)` — add with next position
- `removeWidget(widgetId)` — delete
- `updateWidgetPosition(widgetId, position)` — reorder
- `updateWidgetSize(widgetId, size)` — resize
- `seedDefaultWidgets(roles)` — create defaults based on role (called on first visit)

Data fetching (one per widget type):
- `fetchAttendanceToday()` — today's status + total present/absent/late
- `fetchLateCountMonth()` — count of late days this month
- `fetchOvertimeMonth()` — total OT hours this month
- `fetchMyTasksSummary()` — count by status (todo/in-progress/done)
- `fetchOverdueTasks()` — count of overdue tasks
- `fetchTimesheetWeek()` — hours logged this week vs required
- `fetchPendingApprovals()` — count of pending approvals
- `fetchPendingForms()` — count of incomplete assigned forms
- `fetchLeaveBalances()` — current year balances
- `fetchUpcomingLeaves()` — next 5 approved leaves in company
- `fetchPayrollSummary()` — latest payroll period totals
- `fetchAttendanceRateMonth()` — present/late/absent percentages for donut
- `fetchLeaveUsageType()` — leave count by type for pie chart
- `fetchTaskCompletionRate()` — completed vs total tasks for bar chart
- `fetchTeamTaskProgress()` — per-member task completion for bar chart
- `fetchHeadcountDepartment()` — employee count per dept for bar chart
- `fetchAttendanceTrend()` — daily attendance rate last 30 days for line chart
- `fetchPayrollCostTrend()` — last 6 periods net pay totals for line chart
- `fetchDepartmentComparison()` — multi-metric per dept for grouped bar

Each returns a simple data structure the widget component can render directly.

- [ ] **Step 1: Create dashboard actions with all functions**
- [ ] **Step 2: Verify build + commit**

---

## Task 3: Widget Components — Data Widgets

**Files:** Create 8 small widget components in `src/components/dashboard/widgets/`

Each is a simple client component receiving `data` prop and rendering a card with number + label.

1. `attendance-today.tsx` — Shows "Present: X, Late: Y, Absent: Z" with colored numbers
2. `late-count-month.tsx` — Single number: "X times late this month"
3. `overtime-month.tsx` — "X.X hours OT this month"
4. `my-tasks-summary.tsx` — "To Do: X, In Progress: Y, Done: Z"
5. `overdue-tasks.tsx` — Red number: "X tasks overdue"
6. `timesheet-week.tsx` — "X.X / Y hrs logged this week" with progress bar
7. `pending-approvals.tsx` — Badge number: "X pending"
8. `pending-forms.tsx` — Badge number: "X forms to fill"

- [ ] **Step 1: Create all 8 components**
- [ ] **Step 2: Verify build + commit**

---

## Task 4: Widget Components — Info + Chart Widgets

**Files:** Create 11 medium/large widget components

Each chart widget uses recharts (already installed): `import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";`

Medium widgets:
1. `leave-balances.tsx` — Mini balance cards (type: remaining/total)
2. `upcoming-leaves.tsx` — List of next 5 leaves (name, type, dates)
3. `payroll-summary.tsx` — Latest period: total gross, deductions, net
4. `attendance-rate-month.tsx` — Donut/pie chart: present %, late %, absent %
5. `leave-usage-type.tsx` — Pie chart: leave count by type
6. `task-completion-rate.tsx` — Bar chart: completed vs pending
7. `team-task-progress.tsx` — Horizontal bar: per-member completion %
8. `headcount-department.tsx` — Vertical bar: employee count per dept

Large widgets:
9. `attendance-trend.tsx` — Line chart: daily attendance rate last 30 days
10. `payroll-cost-trend.tsx` — Line chart: net pay per period last 6 periods
11. `department-comparison.tsx` — Grouped bar: attendance rate + late rate + task completion by dept

- [ ] **Step 1: Create all 11 chart/info widgets**
- [ ] **Step 2: Verify build + lint + commit**

---

## Task 5: Dashboard Grid + Widget Card + Customize Panel

**Files:** Create 3 core dashboard components

1. `widget-card.tsx` — Generic wrapper: Card with title, size-based col-span class (`col-span-1`/`col-span-2`/`col-span-3`), renders the correct widget component based on `widget_type` prop. Passes fetched data. "Remove" button on hover. Size selector.

2. `dashboard-grid.tsx` — Main grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Maps user's widgets, renders WidgetCard for each. "Customize" button in header. Fetches all widget data in parallel on mount.

3. `customize-panel.tsx` — Side panel (Sheet): lists all available widget types with toggle checkboxes. Shows currently added widgets with reorder up/down buttons + size selector (small/medium/large). "Add Widget" adds with default size. Changes save immediately.

- [ ] **Step 1: Create all 3 components**
- [ ] **Step 2: Verify build + lint + commit**

---

## Task 6: Dashboard Page

**Files:** Modify `src/app/(portal)/dashboard/page.tsx`

Replace current minimal dashboard with:
1. Fetch user roles
2. Fetch `getMyWidgets()`
3. If no widgets exist, call `seedDefaultWidgets(roles)` then re-fetch
4. Render DashboardGrid with widgets and roles

- [ ] **Step 1: Rewrite dashboard page**
- [ ] **Step 2: Verify build + lint + commit**

---

## Task 7: Final Integration + Deploy

- [ ] **Step 1: Full verification**
```bash
npm test && npm run build && npm run lint
```

- [ ] **Step 2: Push migration**
```bash
npx supabase db push
```

- [ ] **Step 3: Deploy**
```bash
npx vercel --prod --yes
```
