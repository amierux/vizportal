# VizPortal Comprehensive Overhaul — Design Spec

**Date:** 2026-04-24
**Approach:** Hybrid — shared foundations first, then per-page rollout
**Deployment:** Big bang on feature branch
**Aesthetic:** Bold and dynamic (animated counters, staggered reveals, glassmorphism, gradient accents)
**Inspiration:** Linear, Stripe, Vercel, Notion dashboard patterns

---

## Table of Contents

1. [Phase 1: Infrastructure & Performance Foundation](#phase-1-infrastructure--performance-foundation)
2. [Phase 2: Design System & Animation Framework](#phase-2-design-system--animation-framework)
3. [Phase 3: Dashboard Overhaul](#phase-3-dashboard-overhaul)
4. [Phase 4: Per-Page Analytics System](#phase-4-per-page-analytics-system)
5. [Phase 5: Data Layer & Supabase RPC Functions](#phase-5-data-layer--supabase-rpc-functions)
6. [Phase 6: Global Effects & Polish](#phase-6-global-effects--polish)
7. [Phase 7: Per-Page Rollout](#phase-7-per-page-rollout)
8. [New Dependencies](#new-dependencies)
9. [File Structure](#file-structure)

---

## Phase 1: Infrastructure & Performance Foundation

### 1.1 Supabase Query Optimization

**N+1 Query Fixes (dashboard.ts):**
- `fetchDepartmentComparison()` — 4 sequential queries → 1 RPC function with JOINs
- `fetchAttendanceTrend()` — client-side GROUP BY → database-level aggregation
- `fetchPayrollCostTrend()` — fetches 500 rows + JS grouping → database-level SUM/GROUP BY
- `fetchLeaveUsageType()` — loads all approved leaves → database COUNT/GROUP BY
- `fetchTaskCompletionRate()` — loads all tasks with status → database COUNT with JOIN
- `fetchTeamTaskProgress()` — loads all tasks then slices → database LIMIT + JOIN

**`.select()` Column Filtering:**
- Audit all 36 action files, replace `"*"` with explicit column lists
- Priority targets: `fetchAttendanceToday`, `fetchLateCountMonth`, `fetchOvertimeMonth`, `fetchMyTasksSummary`, `getMyWidgets`

**Parallel Query Execution:**
- `recalculateDailySummary()` (attendance.ts) — 3 sequential queries → `Promise.all()`
- `createTask()` (workspace-tasks.ts) — 3 sequential fetches → `Promise.all()`
- `updateTaskStatus()` (workspace-tasks.ts) — profile + status fetch → `Promise.all()`
- `getAttendanceSummaries()` — push department filter to database, not client-side

**Pagination & Limits:**
- `getAllLeaveBalances` — add `.range()` pagination
- `getLeaveRequests` — add `.range()` pagination
- `fetchTeamTaskProgress` — add `.limit(10)` to match client-side slice
- `fetchHeadcountDepartment` — use COUNT instead of fetching all rows

### 1.2 Next.js Configuration

Update `next.config.ts` with:
- **React Compiler** enabled (React 19.2 automatic memoization)
- **Image optimization** — configured domains, formats (webp/avif)
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Partial Pre-Rendering (PPR)** — hybrid static/dynamic for portal pages
- **`staleTimes`** — client-side router cache configuration
- **Compression** enabled

### 1.3 Layout Optimization

- **React `cache()` wrapper** on profile + roles queries in `(portal)/layout.tsx` — deduplicate the 2 Supabase calls that run on every page load
- **Dynamic imports** for widget components in `widget-card.tsx` — replace 20 static imports with `next/dynamic` + loading skeletons
- **Bundle splitting** — lazy-load heavy components: form builder, Gantt view, Kanban board

### 1.4 Client Component Audit

- Audit 140+ `"use client"` components for unnecessary client marking
- Split server/client boundaries where possible (server wrapper → client interactive island)
- Priority: dashboard widgets, settings forms, read-only display components

---

## Phase 2: Design System & Animation Framework

### 2.1 New Dependencies

- **`framer-motion`** — spring physics, page transitions, stagger sequences, gesture animations, layout animations
- **`jspdf`** + **`html2canvas`** — client-side PDF generation
- **`@react-pdf/renderer`** — server-side styled PDF report templates

### 2.2 Animation System (`src/lib/animations/`)

**Spring Presets:**
- `snappy`: stiffness 300, damping 25 — buttons, toggles
- `gentle`: stiffness 150, damping 20 — page transitions, panels
- `bouncy`: stiffness 400, damping 15 — notifications, badges

**Stagger Variants:**
- Container/child pattern for lists, grids, cards
- 50-80ms delay per item
- `fadeInUp`, `fadeInScale`, `slideInRight` child variants

**Page Transition Wrapper:**
- Fade + slide-up on route entry (250ms spring)
- Fade + slight scale-down on exit (150ms)
- Back navigation reverses direction (slide down)
- Implemented via Framer Motion `AnimatePresence` in `(portal)/layout.tsx`

**Accessibility:**
- All animations respect `prefers-reduced-motion`
- Reduced motion: instant transitions, no springs, no stagger

### 2.3 Glassmorphism Card System

**Glass Card Component (`<GlassCard>`):**
- Semi-transparent background (`bg-white/60 dark:bg-slate-900/40`)
- Backdrop blur (`backdrop-blur-xl`)
- Subtle border (`border border-white/20 dark:border-white/10`)
- Gradient shine on hover (diagonal sweep)

**Depth Layers (3 elevations):**
- `surface` — subtle blur, minimal shadow (default cards)
- `raised` — medium blur + shadow (KPI cards, active widgets)
- `floating` — heavy blur + strong shadow (modals, overlays)

**KPI Card Variant:**
- Glass card with gradient accent strip on left edge (4px, primary color)
- Animated count-up number (0 → final value, 800ms ease-out)
- Trend indicator: green up-arrow or red down-arrow with percentage
- Sparkline mini-chart (last 7 data points, 60px wide)

### 2.4 Skeleton Loading System

**Base Skeleton:**
- Shimmer animation: gradient sweep left-to-right, 2s loop
- Content-shaped placeholders matching actual component dimensions (Stripe-style)

**Widget-Specific Skeletons:**
- Chart skeleton: placeholder bars/lines with shimmer
- Table skeleton: row shapes with column-width-matched blocks
- Card skeleton: rounded text lines + circle avatar placeholder
- KPI skeleton: large number block + small sparkline block

**Suspense Integration:**
- Wrap data-fetching sections in `<Suspense fallback={<WidgetSkeleton type={widgetType} />}>`
- Per-widget Suspense boundaries — one slow widget doesn't block others
- KPI strip loads first (fastest query), charts load progressively

### 2.5 Micro-interactions

**Buttons:**
- Press: scale 0.97 (50ms), spring back on release
- Loading: spinner replaces text, width maintains
- Success: checkmark morph animation

**Cards:**
- Hover: `scale: 1.02, y: -2`, shadow deepens to raised elevation
- Framer Motion `whileHover` + `whileTap`

**Table Rows:**
- Hover: left accent bar slides in (0→3px, primary color), background transitions
- Selection: checkbox scales with spring (0.8→1), row gets subtle elevated shadow

**Form Inputs:**
- Focus: border transitions to primary color + glow (0→3px box-shadow spread)
- Validation error: horizontal shake (3px, 3 cycles, 300ms), error text slides in
- Submit success: button → checkmark icon morph

**Modals/Dialogs:**
- Open: backdrop blurs (0→8px, 200ms), dialog scales 0.95→1 + fade with spring
- Close: reverse, faster (150ms)
- Sheets: slide from right with spring overshoot

**Toasts:**
- Enter: slide from right with spring physics, glassmorphism card
- Exit: fade + slide right (200ms)
- Progress bar countdown on timed toasts

### 2.6 Chart Enhancements

**Entrance Animations:**
- Bar charts: bars grow from x-axis, staggered 100ms per bar
- Line charts: stroke-dasharray reveal over 1.2s ease-out
- Pie/Donut charts: slices rotate in (0→360deg, 800ms cubic-bezier)
- Area charts: fill opacity fades in after line draws

**Theme-Aware Colors:**
- Replace hardcoded hex values with CSS custom properties from design tokens
- Chart colors use `--chart-1` through `--chart-5` variables (already defined in globals.css)

**Custom Tooltips:**
- Glassmorphism tooltip cards replacing default Recharts tooltips
- Animated entrance (scale from 0.9, fade in)
- Contextual formatting (currency for payroll, % for rates, hours for time)

**Interactive Legends:**
- Click legend item → isolate that series (others dim to 20% opacity)
- Hover legend item → highlight corresponding series
- Smooth opacity transitions (200ms)

**Animated Axis Labels:**
- Crosshair follows cursor with smooth interpolation on hover

---

## Phase 3: Dashboard Overhaul

Inspired by **Stripe** (hero metrics strip), **Linear** (density + progressive disclosure), **Vercel** (clean grid), **Notion** (customization).

### 3.1 Layout Structure

```
+------------------------------------------------------------------+
|  HERO METRICS STRIP (4-6 KPI cards, always visible, 100px)       |
|  [Hours Today ▲] [Leave Balance] [My Tasks] [Pending Actions]    |
+------------------------------------------------------------------+
|                                                                    |
|  ANALYTICS GRID (flexible card grid, drag-to-reorder)             |
|  +------------------+  +------------------+  +------------------+ |
|  | Attendance Trend  |  | Task Progress    |  | Leave Usage      | |
|  | (Line Chart)      |  | (Stacked Bar)    |  | (Donut)          | |
|  +------------------+  +------------------+  +------------------+ |
|  +------------------+  +-------------------------------------+    |
|  | Late This Month   |  | Department Comparison (Full-width) |    |
|  | (KPI Card)        |  | (Multi-series Bar)                 |    |
|  +------------------+  +-------------------------------------+    |
|                                                                    |
+------------------------------------------------------------------+
```

### 3.2 Hero Metrics Strip (Role-Aware)

**Members see:**
- Hours Today (live animated counter) | Leave Balance (days remaining) | My Tasks (todo/done ratio) | Pending Actions (forms + approvals)

**Admins/Managers see:**
- Present Today (count + % with sparkline) | Pending Approvals (count with age indicator) | Payroll This Period (total cost) | Open Tasks Company-wide (count + overdue %)

Each card: glassmorphism background, animated count-up on load, trend comparison vs last period (green up / red down arrow with %), click → navigates to relevant module page.

### 3.3 Widget System (3 Tiers)

**Tier 1 — Summary Cards (1x1 grid):**
- Single KPI with sparkline
- Animated counter, trend badge
- Pulse glow on threshold breach (e.g., attendance < 80%)

**Tier 2 — Charts (2x1 or 2x2 grid):**
- Interactive Recharts with glassmorphism container
- Entrance animations, hover tooltips (glass cards), legend interactions
- Types: line, bar, stacked bar, area, donut, heatmap, treemap

**Tier 3 — Smart Tables (3x1 or full-width):**
- Compact data tables with inline sparklines, status badges, progress bars
- Sortable columns, row hover effects
- Examples: "Top 5 Late Employees", "Overdue Tasks by Member", "Upcoming Leaves This Week"

### 3.4 Customization Panel (Notion-style)

- Right-side sheet with categorized widget catalog (Attendance, Leave, Payroll, Tasks, HR, Forms)
- Preview thumbnail for each widget before adding
- Drag handle to reorder with Framer Motion layout animations
- Size selector (S/M/L) per widget
- **Layout presets**: "Executive View", "HR Operations", "Team Lead", "Personal" — one-click templates
- Widget add: pop-in with scale spring (0.8→1) + opacity
- Widget remove: shrink + fade + slide-up exit
- Widget reorder: smooth position transitions via `layoutId`

### 3.5 Progressive Disclosure (Linear-style)

- KPI strip + first 6 widgets load immediately
- Below-fold widgets lazy-load on scroll with staggered fade-in
- Each widget "..." menu: Expand (full-screen modal), Export, Remove, Resize
- Expanded view: full dataset with filters, date range picker, department selector

### 3.6 Export System

**Per-Widget Export (via "..." menu):**
- **CSV**: Raw data behind the widget as downloadable CSV
- **PDF**: Styled snapshot of widget with company logo header and timestamp

**Full Dashboard Export (header button):**
- **PDF Report**: Multi-page document:
  - Cover page (company logo, report title, date range, generated by)
  - KPI summary page (all hero metrics with trends)
  - One page per widget category (Attendance, Leave, Payroll, Tasks, HR)
  - Generated via `html2canvas` + `jsPDF` (client-side) or `@react-pdf/renderer` (server-side)
- **CSV Archive**: Zipped file with individual CSVs per widget dataset

**Implementation:**
- `src/lib/utils/export-pdf.ts` — PDF generation helpers
- `src/lib/utils/export-csv.ts` — CSV generation + zip helpers
- `src/components/shared/export-menu.tsx` — reusable export dropdown component

### 3.7 Data Refresh

- Auto-refresh hero metrics every 60s (personal attendance counter is live)
- Charts refresh on page focus (`visibilitychange` event)
- Manual refresh button with rotation animation
- Stale data indicator: "Updated 5m ago" timestamp per widget

---

## Phase 4: Per-Page Analytics System

### 4.1 Shared Analytics Components

**`<AnalyticsPanel>`:**
- Collapsible section with smooth height animation (Framer Motion `AnimatePresence` + `motion.div` with `layout`)
- Open/closed state persisted per page in localStorage
- Title bar with collapse toggle, date range picker, department filter (admin only), export button
- Two sections: KPI cards row (always visible when open) + expandable charts area

**`<KpiCard>`:**
- Glassmorphism card, animated counter (count-up), trend arrow with %, sparkline
- Click → opens `<DrillDownSheet>` with detailed breakdown
- Threshold alerts: pulse glow when metric breaches defined threshold

**`<AnalyticsGrid>`:**
- Responsive grid: 4-col desktop, 2-col tablet, 1-col mobile
- Holds KPI cards and chart components
- Staggered entrance animation on panel open

**`<DrillDownSheet>`:**
- Right-side slide-in panel (Framer Motion spring)
- Triggered by clicking a KPI card
- Shows detailed table + chart breakdown
- Filters: date range, department, individual member
- Export button (CSV/PDF) for drill-down data

**`<TrendChart>` / `<DistributionChart>` / `<ComparisonBar>`:**
- Reusable Recharts wrappers with glassmorphism container
- Consistent entrance animations, tooltips, legend behavior
- Theme-aware colors

### 4.2 Per-Page Analytics Breakdown

#### Attendance (`/attendance`, `/attendance/manage`)

**Personal (all roles):**
- Today's status card (animated clock-in duration counter)
- Monthly attendance rate (donut chart)
- Streak counter (consecutive on-time days)

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Present % today | 30-day attendance heatmap by department |
| Late % this month | Tardiness distribution histogram |
| Avg hours/day | Peak absence days calendar |
| Absence rate trend (sparkline) | Shift compliance % by team (horizontal bar) |

Drill-down: Click department → individual member attendance breakdown

#### Leave (`/leave`, `/leave/manage`)

**Personal:**
- Balance cards with animated fill bars
- Usage donut by leave type
- Days until next approved leave

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Total days used this month | Leave usage by type (stacked bar, monthly) |
| Pending requests count | Department coverage matrix (heatmap) |
| Avg approval time | Unused balance risk report (bar) |
| Utilization % company-wide | Peak leave periods calendar overlay |

Drill-down: Click leave type → per-member usage breakdown

#### Payroll (`/payroll`, `/payroll/process`)

**Personal:**
- Net pay trend (sparkline, last 6 periods)
- Deductions breakdown donut
- YTD earnings counter

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Total payroll cost this period | Department cost breakdown (horizontal bar) |
| Cost vs last period % | Salary band distribution (histogram by job level) |
| Avg salary | Deduction category trends (stacked area) |
| Total deductions | Period-over-period cost comparison (grouped bar) |

Drill-down: Click department → individual salary details

#### Employees (`/employees`)

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Total headcount | Department composition (treemap) |
| New hires this month | Job level distribution (pyramid/funnel) |
| Probationary count | Employment status breakdown (donut) |
| Avg tenure | Tenure distribution (histogram) |

Drill-down: Click department → member list with role, level, tenure

#### Workspace (`/workspace`)

**Personal:**
- My tasks summary (animated counters: todo/in-progress/done)
- Overdue count with urgency pulse
- Completion rate this week

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Team completion rate | Task status distribution by folder (stacked bar) |
| Overdue tasks count | Workload per member (horizontal bar) |
| Avg task cycle time | Weekly velocity trend (line) |
| Active blockers | Priority pipeline (funnel chart) |

Drill-down: Click member → their task breakdown

#### Timesheet (`/timesheet`)

**Personal:**
- Hours logged this week vs required (radial progress)
- Submission streak counter

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Submission rate this week % | Utilization by department (bar) |
| Avg hours logged | Submission compliance trend (line) |
| Overtime flags count | Hours distribution (box plot or histogram) |
| Non-submitters count | Project time allocation (donut, if workspace-linked) |

Drill-down: Click department → per-member submission status

#### Overtime (`/overtime`)

**Personal:**
- OT hours this month (animated counter)
- Approval status breakdown (donut)

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Total OT hours this month | OT trend by month (area chart) |
| OT cost estimate | Department OT distribution (bar) |
| Approval rate % | Frequency per employee (scatter) |
| Top OT department | OT vs regular hours ratio (stacked bar) |

Drill-down: Click department → individual OT patterns

#### Forms (`/forms`)

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Active forms count | Submission rate by form (bar) |
| Pending submissions | Completion trends (line) |
| Avg completion time | Overdue submissions list (smart table) |
| Response rate % | — |

#### Approvals (`/approvals`)

**Admin/Manager Panel:**
| KPI | Chart |
|-----|-------|
| Pending count | Approval volume trend (line) |
| Avg approval time | SLA compliance % (gauge or progress) |
| Approved/Rejected ratio | Bottleneck identification (bar: pending per approver) |
| Oldest pending age | — |

### 4.3 Per-Page Export

Every analytics panel includes an export button:
- **CSV**: All analytics data for current filters exported as CSV
- **PDF**: Styled report with KPIs + charts rendered as images, company branding

---

## Phase 5: Data Layer & Supabase RPC Functions

### 5.1 New Database Functions (PostgreSQL RPC)

```sql
-- Each function returns aggregated JSON, avoiding N+1 queries

rpc_attendance_analytics(p_company_id, p_date_from, p_date_to, p_department_id?)
  → { present_today, late_pct_month, avg_hours_day, absence_trend[], dept_heatmap[], shift_compliance[] }

rpc_leave_analytics(p_company_id, p_date_from, p_date_to, p_department_id?)
  → { days_used_month, pending_count, avg_approval_time, utilization_pct, usage_by_type[], coverage_matrix[], unused_risk[] }

rpc_payroll_analytics(p_company_id, p_period_count?)
  → { total_cost, cost_vs_last_pct, avg_salary, total_deductions, dept_cost[], salary_bands[], deduction_trends[], period_comparison[] }

rpc_employee_analytics(p_company_id)
  → { headcount, new_hires_month, probationary_count, avg_tenure, dept_composition[], level_distribution[], status_breakdown[], tenure_histogram[] }

rpc_workspace_analytics(p_company_id, p_date_from, p_date_to, p_folder_id?)
  → { completion_rate, overdue_count, avg_cycle_time, blockers, status_by_folder[], workload_per_member[], velocity_trend[], priority_pipeline[] }

rpc_timesheet_analytics(p_company_id, p_week_start)
  → { submission_rate, avg_hours, overtime_flags, non_submitters, utilization_by_dept[], compliance_trend[], hours_distribution[] }

rpc_overtime_analytics(p_company_id, p_date_from, p_date_to)
  → { total_hours, cost_estimate, approval_rate, top_dept, monthly_trend[], dept_distribution[], frequency_scatter[] }

rpc_approval_analytics(p_company_id, p_date_from, p_date_to)
  → { pending_count, avg_time, approved_rejected_ratio, oldest_age, volume_trend[], sla_compliance, bottlenecks[] }

rpc_form_analytics(p_company_id)
  → { active_count, pending_submissions, avg_completion_time, response_rate, submission_rates[], completion_trends[] }

rpc_dashboard_summary(p_company_id, p_user_id)
  → Single call returning all dashboard widget data for initial page load (replaces 20 individual fetches).
    Individual widget refreshes (via manual refresh or auto-refresh) still call per-widget RPCs for granular caching.
```

### 5.2 Caching Strategy

- **React `cache()`** wrapper on all server-side data fetchers — deduplicates within single render pass
- **`unstable_cache` / `cacheLife`** for analytics data — 5-minute staleness tolerance
- **Revalidation tags** — `revalidateTag('attendance')` when clock entries change, `revalidateTag('leave')` on leave request mutations, etc.
- **Per-widget caching** — dashboard widgets cached independently; personal data (attendance counter) uncached

### 5.3 Action File Refactoring

- **New `src/lib/actions/analytics.ts`** — centralized analytics data layer calling RPC functions
- **Existing action files** — refactored: `.select()` filtering, `Promise.all()` parallel queries, proper `.range()` pagination
- **Shared query helpers** extracted to `src/lib/actions/helpers.ts`:
  - `getCompanyId()` — cached company ID lookup
  - `getUserRoles()` — cached role lookup
  - `getDateRange(period)` — standardized date range calculation

### 5.4 Role-Based Data Access

- RPC functions accept `p_user_role` parameter
- **Member** — personal data only, team analytics excluded from response
- **Team Leader / Dept Manager** — department-scoped analytics (filtered by their department)
- **Admin / HR / Director / Business Manager** — company-wide analytics
- RLS policies enforced at database level as additional security layer

---

## Phase 6: Global Effects & Polish

### 6.1 Sidebar Enhancements

- Active item: left accent bar (3px, primary) slides to position with spring animation
- Hover: background fill expands from left (150ms ease)
- Collapse: smooth width transition (256→64px, 200ms), icons scale up when collapsed, tooltips on hover
- Section groups: collapsible with rotating chevron (0→90deg)
- User avatar: subtle ring pulse when notifications pending

### 6.2 Table Enhancements (All Data Tables)

- Row hover: left accent bar slides in, background transitions
- Sort click: column header arrow rotates with spring
- Pagination: horizontal slide transition (direction-aware)
- Empty state: animated floating icons illustration + CTA
- Loading: row-shaped skeleton shimmer matching column widths
- Row selection: checkbox scale spring (0.8→1), selected row elevated shadow

### 6.3 Form Enhancements (All Forms)

- Input focus: primary border + glow (0→3px box-shadow)
- Validation error: horizontal shake (3px, 3 cycles, 300ms), error text slides in
- Submit: loading spinner state → success checkmark morph
- Multi-step: animated progress bar fill, step indicators scale on completion

### 6.4 Notification System

- Bell: badge count animates (scale spring) on new notification, subtle bounce
- Dropdown: staggered item entrance (40ms per item), unread items glow accent
- Toast enter: slide from right + spring, glassmorphism card
- Toast exit: fade + slide right (200ms)

### 6.5 Modal/Dialog Enhancements

- Open: backdrop blur (0→8px, 200ms), dialog scale 0.95→1 + fade spring
- Close: reverse, faster (150ms)
- Sheets: slide from right with spring overshoot, backdrop darkens

### 6.6 Scroll Effects

- Header: shadow appears on scroll (triggered at 10px)
- Sticky table headers: smooth shadow appearance
- Back-to-top: floating button fades in after 500px scroll, bounce entrance

### 6.7 Theme Transitions

- All colors transition simultaneously (200ms) — no flash
- Consistent semantic color palette:
  - Success/Present/Approved: emerald + subtle glow
  - Warning/Late/Pending: amber
  - Error/Absent/Rejected: rose
  - Info/On Leave: blue
  - Neutral/Rest Day: slate

### 6.8 Mobile Enhancements

- Bottom tabs: active icon scales up (1→1.15) spring, label fades in
- Pull-to-refresh: custom animated indicator
- Swipe gestures: swipe left on table rows for quick actions
- Sheet navigation: full-screen from bottom on mobile

### 6.9 Empty States

- Animated SVG illustrations with gentle floating motion (3s `translateY` oscillation)
- Contextual message + primary CTA with pulse glow
- Per-page: relevant message + action button

---

## Phase 7: Per-Page Rollout

Apply all foundations (animation system, glassmorphism, analytics, effects) to each module in order:

1. **Dashboard** — hero metrics, widget overhaul, export system, customization panel
2. **Attendance** — personal + admin analytics panel, table effects, skeleton loaders
3. **Leave** — personal + admin analytics panel, balance card animations, coverage heatmap
4. **Payroll** — personal + admin analytics panel, cost charts, export
5. **Workspace** — personal + admin analytics panel, Kanban/Gantt effects, task card animations
6. **Employees** — admin analytics panel, directory effects, treemap/pyramid charts
7. **Timesheet** — personal + admin analytics panel, radial progress, compliance charts
8. **Overtime** — personal + admin analytics panel, trend/scatter charts
9. **Forms** — admin analytics panel, form builder polish, submission analytics
10. **Approvals** — admin analytics panel, SLA charts, bottleneck visualization
11. **Settings** — form polish, table effects (no analytics needed)
12. **Profile / Company** — card effects, layout polish

---

## New Dependencies

```json
{
  "framer-motion": "^11.0.0",
  "jspdf": "^2.5.0",
  "html2canvas": "^1.4.0",
  "@react-pdf/renderer": "^4.0.0"
}
```

**Removed/unchanged:** Recharts stays (already installed), no additional chart library needed.

---

## File Structure (New Files)

```
src/
├── lib/
│   ├── animations/
│   │   ├── spring-presets.ts          # Reusable spring configs (snappy, gentle, bouncy)
│   │   ├── stagger-variants.ts        # Container/child Framer Motion variants
│   │   └── chart-animations.ts        # Recharts animation config helpers
│   ├── actions/
│   │   ├── analytics.ts               # Centralized analytics data layer (calls RPCs)
│   │   └── helpers.ts                 # Shared: getCompanyId, getUserRoles, getDateRange
│   └── utils/
│       ├── export-pdf.ts              # PDF generation helpers (html2canvas + jsPDF)
│       ├── export-csv.ts              # CSV generation + zip helpers
│       └── export-report.ts           # Full dashboard report generator
├── components/
│   ├── analytics/
│   │   ├── analytics-panel.tsx        # Collapsible analytics section wrapper
│   │   ├── kpi-card.tsx               # Glassmorphism KPI with counter + sparkline
│   │   ├── analytics-grid.tsx         # Responsive grid for KPI cards
│   │   ├── drill-down-sheet.tsx       # Slide-in detail panel
│   │   ├── trend-chart.tsx            # Reusable line/area chart wrapper
│   │   ├── distribution-chart.tsx     # Reusable donut/pie/histogram wrapper
│   │   ├── comparison-bar.tsx         # Reusable bar chart wrapper
│   │   ├── heatmap-chart.tsx          # Calendar/grid heatmap
│   │   └── sparkline.tsx              # Mini inline chart for KPI cards
│   ├── shared/
│   │   ├── glass-card.tsx             # Glassmorphism card (surface/raised/floating)
│   │   ├── animated-counter.tsx       # Count-up number animation
│   │   ├── skeleton-widget.tsx        # Widget-type-aware skeleton
│   │   ├── export-menu.tsx            # Dropdown: CSV / PDF export
│   │   ├── page-transition.tsx        # AnimatePresence route wrapper
│   │   ├── empty-state.tsx            # Animated empty state with illustration
│   │   └── date-range-picker.tsx      # Shared date range filter
│   └── dashboard/
│       ├── hero-metrics.tsx           # Top KPI strip (role-aware)
│       ├── layout-presets.tsx         # Preset layout selector
│       └── dashboard-export.tsx       # Full dashboard PDF/CSV export
supabase/
└── migrations/
    ├── 0064_rpc_attendance_analytics.sql
    ├── 0065_rpc_leave_analytics.sql
    ├── 0066_rpc_payroll_analytics.sql
    ├── 0067_rpc_employee_analytics.sql
    ├── 0068_rpc_workspace_analytics.sql
    ├── 0069_rpc_timesheet_analytics.sql
    ├── 0070_rpc_overtime_analytics.sql
    ├── 0071_rpc_approval_analytics.sql
    ├── 0072_rpc_form_analytics.sql
    ├── 0073_rpc_dashboard_summary.sql
    └── 0074_scheduled_reports_table.sql
```

---

## Non-Goals (Explicitly Out of Scope)

- AI-powered predictive analytics (future enhancement)
- Real-time WebSocket dashboard updates (use polling for now)
- Scheduled email report delivery (table created but delivery deferred)
- Mobile native app (responsive web only)
- Internationalization / multi-language
