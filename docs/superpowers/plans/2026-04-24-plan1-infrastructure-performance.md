# Plan 1: Infrastructure & Performance Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Supabase queries, Next.js configuration, and data fetching patterns to create a fast, efficient foundation before adding animations and analytics.

**Architecture:** Fix N+1 queries with database-level aggregation (Supabase RPC functions), parallelize independent queries with `Promise.all()`, add `.select()` column filtering, configure Next.js for React Compiler + security headers + image optimization, deduplicate layout queries with React `cache()`, and create shared action helpers.

**Tech Stack:** Next.js 16.2, React 19.2, Supabase (PostgreSQL 17), TypeScript 5, Vitest

---

## File Structure

### New Files
```
src/lib/actions/helpers.ts              — Shared query helpers (getCompanyId, getUserRoles, getDateRange)
src/lib/actions/analytics.ts            — Centralized analytics data layer (RPC callers)
src/lib/utils/export-csv.ts             — CSV generation utilities
src/lib/utils/export-pdf.ts             — PDF generation utilities
supabase/migrations/00064_rpc_attendance_analytics.sql
supabase/migrations/00065_rpc_leave_analytics.sql
supabase/migrations/00066_rpc_payroll_analytics.sql
supabase/migrations/00067_rpc_employee_analytics.sql
supabase/migrations/00068_rpc_workspace_analytics.sql
supabase/migrations/00069_rpc_timesheet_analytics.sql
supabase/migrations/00070_rpc_overtime_analytics.sql
supabase/migrations/00071_rpc_approval_analytics.sql
supabase/migrations/00072_rpc_form_analytics.sql
supabase/migrations/00073_rpc_dashboard_summary.sql
```

### Modified Files
```
next.config.ts                                    — Add React Compiler, security headers, image config
src/app/(portal)/layout.tsx                       — Cache profile+roles queries with React cache()
src/lib/actions/dashboard.ts                      — Fix N+1 queries, add .select() filtering, use helpers
src/lib/actions/attendance.ts                     — Parallelize queries, fix client-side filtering
src/lib/actions/workspace-tasks.ts                — Parallelize independent queries
src/lib/actions/leave.ts                          — Add pagination, fix client-side department filter
src/app/(portal)/dashboard/page.tsx               — Use cached helpers, optimize data fetching
src/components/dashboard/widget-card.tsx           — Dynamic imports for widget components
package.json                                      — Add new dependencies (jspdf, html2canvas, @react-pdf/renderer, framer-motion)
```

---

### Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npm install framer-motion jspdf html2canvas @react-pdf/renderer
```

Expected: Successfully installed, package.json updated with 4 new dependencies.

- [ ] **Step 2: Verify installation**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npm ls framer-motion jspdf html2canvas @react-pdf/renderer
```

Expected: All 4 packages listed without errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add package.json package-lock.json && git commit -m "feat: add framer-motion, jspdf, html2canvas, @react-pdf/renderer dependencies"
```

---

### Task 2: Configure Next.js (next.config.ts)

**Files:**
- Modify: `next.config.ts` (currently 7 lines, empty config)

- [ ] **Step 1: Write the updated config**

Replace the entire contents of `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    ppr: "incremental",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify the config compiles**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx next build --no-lint 2>&1 | head -20
```

Expected: Build starts without config errors. If React Compiler requires the babel plugin, install it:
```bash
npm install -D babel-plugin-react-compiler
```

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add next.config.ts && git commit -m "feat: configure Next.js — React Compiler, PPR, image optimization, security headers"
```

---

### Task 3: Create Shared Action Helpers

**Files:**
- Create: `src/lib/actions/helpers.ts`

- [ ] **Step 1: Create the helpers file**

```typescript
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { RoleName } from "@/types";

/**
 * Cached helper: get authenticated user's company_id.
 * Deduplicated within a single React render pass via React cache().
 */
export const getCompanyId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  return data?.company_id ?? null;
});

/**
 * Cached helper: get authenticated user's ID.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
});

/**
 * Cached helper: get authenticated user's roles.
 */
export const getUserRoles = cache(async (): Promise<RoleName[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((ur: any) => ur.roles.name as RoleName);
});

/**
 * Cached helper: get authenticated user's full profile.
 */
export const getUserProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, company_id, profile_completed")
    .eq("id", user.id)
    .single();

  return data;
});

/**
 * Get date range for common periods.
 */
export function getDateRange(period: "today" | "this_month" | "last_30_days" | "this_year") {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (period) {
    case "today":
      return { start: today, end: today };
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      return { start, end: today };
    }
    case "last_30_days": {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { start: d.toISOString().split("T")[0], end: today };
    }
    case "this_year": {
      const start = `${now.getFullYear()}-01-01`;
      return { start, end: today };
    }
  }
}

/**
 * Check if user has one of the specified roles.
 */
export function hasRole(userRoles: RoleName[], required: RoleName[]): boolean {
  return userRoles.some((r) => required.includes(r));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit src/lib/actions/helpers.ts 2>&1 | head -20
```

Expected: No errors, or only errors related to missing imports from other files (not this file).

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/lib/actions/helpers.ts && git commit -m "feat: add shared action helpers — cached getCompanyId, getUserRoles, getDateRange"
```

---

### Task 4: Optimize Portal Layout (Deduplicate Queries)

**Files:**
- Modify: `src/app/(portal)/layout.tsx` (lines 14-46)

The current layout runs 3 Supabase queries on every portal page load: `auth.getUser()`, `profiles.*`, and `user_roles`. Replace direct queries with the cached helpers from Task 3.

- [ ] **Step 1: Rewrite layout.tsx**

Replace the entire file with:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getUserRoles } from "@/lib/actions/helpers";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomTabs } from "@/components/layout/bottom-tabs";
import { Header } from "@/components/layout/header";
import { formatFullName } from "@/lib/utils/format";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, roles] = await Promise.all([
    getUserProfile(),
    getUserRoles(),
  ]);

  if (!profile) {
    redirect("/login");
  }

  if (!profile.profile_completed) {
    redirect("/complete-profile");
  }

  const userName = formatFullName(profile.first_name, profile.last_name);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRoles={roles}
        userName={userName}
        avatarUrl={profile.avatar_url}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userRoles={roles} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomTabs userRoles={roles} />
    </div>
  );
}
```

Key changes:
- Uses `getUserProfile()` and `getUserRoles()` (React `cache()`-wrapped) instead of direct queries
- Both run in `Promise.all()` for parallelism
- Profile query uses `.select()` with specific columns instead of `"*"`
- Any child page calling `getCompanyId()` or `getUserRoles()` will get cached results (zero extra queries)

- [ ] **Step 2: Verify build**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | head -30
```

Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/app/\(portal\)/layout.tsx && git commit -m "perf: deduplicate portal layout queries with React cache() helpers"
```

---

### Task 5: Fix Dashboard Action Queries — Column Filtering & Parallelization

**Files:**
- Modify: `src/lib/actions/dashboard.ts`

This task fixes the most impactful query issues. Focus on: `.select()` filtering, replacing `"*"` with specific columns, and using the cached helpers.

- [ ] **Step 1: Update imports and `getMyWidgets`**

At the top of `dashboard.ts`, add the helpers import. Then fix `getMyWidgets` to use specific columns:

Replace lines 1-24:
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCompanyId, getUserId, getDateRange } from "@/lib/actions/helpers";
import type { RoleName } from "@/types";

// ---------------------------------------------------------------------------
// Widget CRUD
// ---------------------------------------------------------------------------

export async function getMyWidgets() {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return [];

  const { data } = await supabase
    .from("dashboard_widgets")
    .select("id, widget_type, position, size")
    .eq("profile_id", userId)
    .order("position");
  return data ?? [];
}
```

- [ ] **Step 2: Fix `addWidget` to use cached helper**

Replace lines 26-63 (the `addWidget` function):
```typescript
export async function addWidget(
  widgetType: string,
  size: "small" | "medium" | "large",
) {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "Not authenticated" };

  const companyId = await getCompanyId();
  if (!companyId) return { error: "Company not found" };

  const { data: existing } = await supabase
    .from("dashboard_widgets")
    .select("position")
    .eq("profile_id", userId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("dashboard_widgets").insert({
    profile_id: userId,
    company_id: companyId,
    widget_type: widgetType,
    position: nextPosition,
    size,
  });

  if (error) return { error: "Failed to add widget" };
  revalidatePath("/dashboard");
  return { success: true };
}
```

- [ ] **Step 3: Fix `fetchAttendanceToday` — use helpers, select specific columns**

Find the `fetchAttendanceToday` function and replace it. The key fix: use `getUserId()` + `getCompanyId()` instead of fetching profile, and select only `status` column:

```typescript
export async function fetchAttendanceToday() {
  const supabase = await createClient();
  const [userId, companyId] = await Promise.all([getUserId(), getCompanyId()]);
  if (!userId || !companyId) return { myStatus: null, companyPresent: 0, companyLate: 0, companyAbsent: 0 };

  const today = new Date().toISOString().split("T")[0];

  const [{ data: myRow }, { data: companyRows }] = await Promise.all([
    supabase
      .from("daily_attendance_summary")
      .select("status")
      .eq("profile_id", userId)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("daily_attendance_summary")
      .select("status")
      .eq("company_id", companyId)
      .eq("date", today),
  ]);

  const rows = companyRows ?? [];
  const companyPresent = rows.filter((r: any) => r.status === "present").length;
  const companyLate = rows.filter((r: any) => r.status === "late").length;
  const companyAbsent = rows.filter(
    (r: any) => r.status === "absent" || r.status === "half_day",
  ).length;

  return { myStatus: myRow?.status ?? null, companyPresent, companyLate, companyAbsent };
}
```

- [ ] **Step 4: Fix `fetchLateCountMonth` — use count instead of fetching rows**

Replace the function:
```typescript
export async function fetchLateCountMonth(): Promise<{ count: number }> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { count: 0 };

  const { start } = getDateRange("this_month");

  const { count } = await supabase
    .from("daily_attendance_summary")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", userId)
    .eq("is_late", true)
    .gte("date", start);

  return { count: count ?? 0 };
}
```

Add the import for `getDateRange` at top if not already:
```typescript
import { getCompanyId, getUserId, getDateRange } from "@/lib/actions/helpers";
```

- [ ] **Step 5: Fix `fetchTeamTaskProgress` — add LIMIT to match client slice**

Find the `fetchTeamTaskProgress` function. The key fix: the function fetches ALL company tasks then `.slice(0, 10)`. While we can't easily add a SQL LIMIT for aggregation, we can at least use `.select()` with only needed columns. The function at lines 653-658 already has a decent select — keep it but ensure we add `.limit(1000)` as a safety cap:

After line 658 (`.not("assignee_id", "is", null)`), add:
```typescript
    .limit(1000);
```

Also replace the profile/company_id fetch at lines 647-651 with:
```typescript
  const companyId = await getCompanyId();
  if (!companyId) return [];
```

And update the query to use `companyId` directly instead of `profile?.company_id ?? ""`.

- [ ] **Step 6: Fix `fetchAttendanceTrend` — use helpers**

Replace the profile fetch (lines 734-736) with:
```typescript
  const companyId = await getCompanyId();
  if (!companyId) return [];
```

And update line 742 to use `companyId` directly.

- [ ] **Step 7: Fix `fetchPayrollCostTrend` — use helpers, reduce limit**

Replace the profile fetch with `getCompanyId()`. Change `.limit(500)` to `.limit(200)` (6 periods × ~30 employees = ~180 entries max for reasonable companies).

- [ ] **Step 8: Fix `fetchDepartmentComparison` — use helpers, parallelize 4 queries**

Replace lines 823-856 with:

```typescript
export async function fetchDepartmentComparison(): Promise<
  Array<{
    department: string;
    attendanceRate: number;
    lateRate: number;
    taskCompletion: number;
  }>
> {
  const supabase = await createClient();
  const companyId = await getCompanyId();
  if (!companyId) return [];

  const { start: startOfMonth } = getDateRange("this_month");

  // Parallel fetch — all 4 queries at once instead of sequential
  const [
    { data: depts },
    { data: empDetails },
    { data: attendance },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId),
    supabase
      .from("employee_details")
      .select("profile_id, department_id")
      .eq("company_id", companyId),
    supabase
      .from("daily_attendance_summary")
      .select("profile_id, status")
      .eq("company_id", companyId)
      .gte("date", startOfMonth),
    supabase
      .from("workspace_tasks")
      .select("assignee_id, workspace_folder_statuses!status_id(is_done)")
      .eq("company_id", companyId)
      .not("assignee_id", "is", null),
  ]);

  if (!depts || depts.length === 0) return [];

  const profileToDept: Record<string, string> = {};
  for (const e of empDetails ?? []) {
    if ((e as any).department_id) {
      profileToDept[(e as any).profile_id] = (e as any).department_id;
    }
  }

  const deptStats: Record<
    string,
    {
      name: string;
      present: number;
      late: number;
      total: number;
      tasksCompleted: number;
      tasksTotal: number;
    }
  > = {};

  for (const dept of depts) {
    deptStats[(dept as any).id] = {
      name: (dept as any).name,
      present: 0,
      late: 0,
      total: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
    };
  }

  for (const row of attendance ?? []) {
    const deptId = profileToDept[(row as any).profile_id];
    if (!deptId || !deptStats[deptId]) continue;
    deptStats[deptId].total++;
    if ((row as any).status === "present") deptStats[deptId].present++;
    if ((row as any).status === "late") deptStats[deptId].late++;
  }

  for (const task of tasks ?? []) {
    const deptId = profileToDept[(task as any).assignee_id];
    if (!deptId || !deptStats[deptId]) continue;
    deptStats[deptId].tasksTotal++;
    const status = (task as any).workspace_folder_statuses;
    const isDone = Array.isArray(status) ? status[0]?.is_done : status?.is_done;
    if (isDone) deptStats[deptId].tasksCompleted++;
  }

  return Object.values(deptStats)
    .filter((d) => d.total > 0 || d.tasksTotal > 0)
    .map((d) => ({
      department: d.name,
      attendanceRate:
        d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0,
      lateRate: d.total > 0 ? Math.round((d.late / d.total) * 100) : 0,
      taskCompletion:
        d.tasksTotal > 0
          ? Math.round((d.tasksCompleted / d.tasksTotal) * 100)
          : 0,
    }));
}
```

Key change: 4 sequential queries → 1 `Promise.all()` saving ~600ms.

- [ ] **Step 9: Apply same helper pattern to ALL remaining fetch functions**

Go through every `fetchXxx` function in dashboard.ts. For each one:
1. Replace the `supabase.auth.getUser()` + `profiles.select("company_id")` pattern with `getCompanyId()` and/or `getUserId()`
2. This applies to: `fetchOvertimeMonth`, `fetchMyTasksSummary`, `fetchOverdueTasks`, `fetchTimesheetWeek`, `fetchPendingApprovals`, `fetchPendingForms`, `fetchLeaveBalances`, `fetchUpcomingLeaves`, `fetchPayrollSummary`, `fetchAttendanceRateMonth`, `fetchLeaveUsageType`, `fetchTaskCompletionRate`, `fetchHeadcountDepartment`, `fetchOutOfOffice`

Each function currently has ~6-8 lines of boilerplate for auth+profile. Replace with 2 lines.

- [ ] **Step 10: Verify build**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | head -30
```

Expected: No type errors.

- [ ] **Step 11: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/lib/actions/dashboard.ts && git commit -m "perf: optimize dashboard queries — cached helpers, parallel fetches, column filtering"
```

---

### Task 6: Fix Attendance Action Queries

**Files:**
- Modify: `src/lib/actions/attendance.ts`

- [ ] **Step 1: Parallelize `recalculateDailySummary` (lines 176-197)**

The three queries (clock_entries, employee_schedules, employee_details) are independent. Replace lines 176-197 with:

```typescript
  const [{ data: entries }, { data: schedule }, { data: empDetail }] = await Promise.all([
    supabase
      .from("clock_entries")
      .select("id, type, timestamp")
      .eq("profile_id", profileId)
      .eq("date", date)
      .order("timestamp", { ascending: true }),
    supabase
      .from("employee_schedules")
      .select("start_time, end_time, work_days")
      .eq("profile_id", profileId)
      .single(),
    supabase
      .from("employee_details")
      .select("break_enabled, break_start_time, break_end_time")
      .eq("profile_id", profileId)
      .single(),
  ]);

  if (!schedule) return;
```

Key changes: 3 sequential queries → 1 `Promise.all()`. Added `.select()` with specific columns instead of `"*"`.

- [ ] **Step 2: Verify build**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | grep "attendance" | head -10
```

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/lib/actions/attendance.ts && git commit -m "perf: parallelize attendance recalculation queries with Promise.all()"
```

---

### Task 7: Fix Workspace Task Action Queries

**Files:**
- Modify: `src/lib/actions/workspace-tasks.ts`

- [ ] **Step 1: Parallelize `createTask` initial queries (lines 25-30, 51-55)**

The profile fetch and list fetch are independent. Replace the sequential pattern at lines 25-55 with:

```typescript
  const [{ data: profile }, { data: list }] = await Promise.all([
    supabase
      .from("profiles")
      .select("company_id, first_name, last_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("workspace_lists")
      .select("folder_id, status_override")
      .eq("id", listId)
      .single(),
  ]);

  if (!profile) return { error: "Profile not found" };
  if (!list) return { error: "List not found" };
```

Then continue with the existing status lookup logic (lines 59-78 stay the same).

- [ ] **Step 2: Parallelize `updateTaskStatus` initial queries (lines 349-364)**

Replace lines 349-364:
```typescript
  const [{ data: profile }, { data: folderStatus }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("workspace_folder_statuses")
      .select("name, requires_approval, is_done")
      .eq("id", statusId)
      .single(),
  ]);

  const userName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Someone";
```

- [ ] **Step 3: Verify build**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | grep "workspace" | head -10
```

- [ ] **Step 4: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/lib/actions/workspace-tasks.ts && git commit -m "perf: parallelize workspace task creation and status update queries"
```

---

### Task 8: Fix Leave Action Queries — Add Pagination

**Files:**
- Modify: `src/lib/actions/leave.ts`

- [ ] **Step 1: Add pagination to `getLeaveRequests` (lines 368-406)**

Replace the function:
```typescript
export async function getLeaveRequests(filters: {
  status?: string;
  departmentId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("leave_requests")
    .select(
      `
      id, status, start_date, end_date, total_days, reason, is_half_day, created_at,
      leave_types(name, code),
      profiles:profile_id(id, first_name, last_name,
        employee_details(department_id, departments(name))
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) query = query.eq("status", filters.status as "pending" | "approved" | "rejected" | "cancelled");
  if (filters.leaveTypeId) query = query.eq("leave_type_id", filters.leaveTypeId);
  if (filters.startDate) query = query.gte("start_date", filters.startDate);
  if (filters.endDate) query = query.lte("end_date", filters.endDate);

  const { data, count } = await query;

  let filtered = data ?? [];
  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = filtered.filter((row: any) => {
      return row.profiles?.employee_details?.department_id === filters.departmentId;
    });
  }

  return { data: filtered, count: count ?? 0 };
}
```

Key changes: Added `page`/`perPage` params, `.range()`, `{ count: "exact" }`, and specific `.select()` columns instead of `"*"`.

- [ ] **Step 2: Add pagination to `getAllLeaveBalances` (lines 411-439)**

Replace:
```typescript
export async function getAllLeaveBalances(filters: {
  year?: number;
  departmentId?: string;
  page?: number;
  perPage?: number;
}) {
  const supabase = await createClient();
  const year = filters.year ?? new Date().getFullYear();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count } = await supabase
    .from("leave_balances")
    .select(
      `
      id, total_days, used_days, remaining_days,
      leave_types(name, code),
      profiles:profile_id(id, first_name, last_name,
        employee_details(department_id, departments(name))
      )
    `,
      { count: "exact" }
    )
    .eq("year", year)
    .range(from, to);

  let filtered = data ?? [];
  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = filtered.filter((row: any) => {
      return row.profiles?.employee_details?.department_id === filters.departmentId;
    });
  }

  return { data: filtered, count: count ?? 0 };
}
```

- [ ] **Step 3: Check for callers that need updating**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && grep -rn "getLeaveRequests\|getAllLeaveBalances" src/ --include="*.ts" --include="*.tsx" | grep -v "actions/leave.ts"
```

Update any callers to handle the new `{ data, count }` return format if they previously expected a flat array.

- [ ] **Step 4: Verify build**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors from callers expecting old return types.

- [ ] **Step 5: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/lib/actions/leave.ts && git commit -m "perf: add pagination to leave queries, use specific column selects"
```

---

### Task 9: Dynamic Widget Imports

**Files:**
- Modify: `src/components/dashboard/widget-card.tsx`

Currently imports all 20 widget components statically (lines 8-27). Replace with `next/dynamic` to lazy-load.

- [ ] **Step 1: Replace static imports with dynamic imports**

Replace lines 1-27 with:

```typescript
"use client";

import { useState, Suspense, lazy } from "react";
import dynamic from "next/dynamic";
import type { DashboardWidget } from "@/types";
import { Button } from "@/components/ui/button";
import { removeWidget, updateWidgetSize } from "@/lib/actions/dashboard";

const widgetComponents: Record<string, React.ComponentType<{ data: any }>> = {
  attendance_today: dynamic(() => import("./widgets/attendance-today").then(m => ({ default: m.AttendanceTodayWidget })), { ssr: true }),
  late_count_month: dynamic(() => import("./widgets/late-count-month").then(m => ({ default: m.LateCountMonthWidget })), { ssr: true }),
  overtime_month: dynamic(() => import("./widgets/overtime-month").then(m => ({ default: m.OvertimeMonthWidget })), { ssr: true }),
  my_tasks_summary: dynamic(() => import("./widgets/my-tasks-summary").then(m => ({ default: m.MyTasksSummaryWidget })), { ssr: true }),
  overdue_tasks: dynamic(() => import("./widgets/overdue-tasks").then(m => ({ default: m.OverdueTasksWidget })), { ssr: true }),
  timesheet_week: dynamic(() => import("./widgets/timesheet-week").then(m => ({ default: m.TimesheetWeekWidget })), { ssr: true }),
  pending_approvals: dynamic(() => import("./widgets/pending-approvals").then(m => ({ default: m.PendingApprovalsWidget })), { ssr: true }),
  pending_forms: dynamic(() => import("./widgets/pending-forms").then(m => ({ default: m.PendingFormsWidget })), { ssr: true }),
  leave_balances: dynamic(() => import("./widgets/leave-balances").then(m => ({ default: m.LeaveBalancesWidget })), { ssr: true }),
  upcoming_leaves: dynamic(() => import("./widgets/upcoming-leaves").then(m => ({ default: m.UpcomingLeavesWidget })), { ssr: true }),
  payroll_summary: dynamic(() => import("./widgets/payroll-summary").then(m => ({ default: m.PayrollSummaryWidget })), { ssr: true }),
  attendance_rate_month: dynamic(() => import("./widgets/attendance-rate-month").then(m => ({ default: m.AttendanceRateMonthWidget })), { ssr: true }),
  leave_usage_type: dynamic(() => import("./widgets/leave-usage-type").then(m => ({ default: m.LeaveUsageTypeWidget })), { ssr: true }),
  task_completion_rate: dynamic(() => import("./widgets/task-completion-rate").then(m => ({ default: m.TaskCompletionRateWidget })), { ssr: true }),
  team_task_progress: dynamic(() => import("./widgets/team-task-progress").then(m => ({ default: m.TeamTaskProgressWidget })), { ssr: true }),
  headcount_department: dynamic(() => import("./widgets/headcount-department").then(m => ({ default: m.HeadcountDepartmentWidget })), { ssr: true }),
  attendance_trend: dynamic(() => import("./widgets/attendance-trend").then(m => ({ default: m.AttendanceTrendWidget })), { ssr: true }),
  payroll_cost_trend: dynamic(() => import("./widgets/payroll-cost-trend").then(m => ({ default: m.PayrollCostTrendWidget })), { ssr: true }),
  department_comparison: dynamic(() => import("./widgets/department-comparison").then(m => ({ default: m.DepartmentComparisonWidget })), { ssr: true }),
  out_of_office: dynamic(() => import("./widgets/out-of-office").then(m => ({ default: m.OutOfOfficeWidget })), { ssr: true }),
};
```

- [ ] **Step 2: Replace the `renderWidget` switch with dynamic lookup**

Replace the `renderWidget` function (lines 48-96) with:

```typescript
function renderWidget(type: string, data: any) {
  if (!data) return <div className="text-sm text-muted-foreground p-4">No data available.</div>;

  const Widget = widgetComponents[type];
  if (!Widget) return <div className="text-sm text-muted-foreground p-4">Unknown widget type.</div>;

  return <Widget data={data} />;
}
```

The rest of the file (WidgetCard component, lines 98-149) stays the same.

- [ ] **Step 3: Verify build**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/components/dashboard/widget-card.tsx && git commit -m "perf: lazy-load widget components with next/dynamic"
```

---

### Task 10: Optimize Dashboard Page

**Files:**
- Modify: `src/app/(portal)/dashboard/page.tsx`

- [ ] **Step 1: Use cached helpers instead of direct queries**

Replace the entire file:

```typescript
import { getUserRoles } from "@/lib/actions/helpers";
import {
  getMyWidgets,
  seedDefaultWidgets,
  fetchAttendanceToday,
  fetchLateCountMonth,
  fetchOvertimeMonth,
  fetchMyTasksSummary,
  fetchOverdueTasks,
  fetchTimesheetWeek,
  fetchPendingApprovals,
  fetchPendingForms,
  fetchLeaveBalances,
  fetchUpcomingLeaves,
  fetchPayrollSummary,
  fetchAttendanceRateMonth,
  fetchLeaveUsageType,
  fetchTaskCompletionRate,
  fetchTeamTaskProgress,
  fetchHeadcountDepartment,
  fetchAttendanceTrend,
  fetchPayrollCostTrend,
  fetchDepartmentComparison,
  fetchOutOfOffice,
} from "@/lib/actions/dashboard";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

const WIDGET_FETCHERS: Record<string, () => Promise<unknown>> = {
  attendance_today: fetchAttendanceToday,
  late_count_month: fetchLateCountMonth,
  overtime_month: fetchOvertimeMonth,
  my_tasks_summary: fetchMyTasksSummary,
  overdue_tasks: fetchOverdueTasks,
  timesheet_week: fetchTimesheetWeek,
  pending_approvals: fetchPendingApprovals,
  pending_forms: fetchPendingForms,
  leave_balances: fetchLeaveBalances,
  upcoming_leaves: fetchUpcomingLeaves,
  payroll_summary: fetchPayrollSummary,
  attendance_rate_month: fetchAttendanceRateMonth,
  leave_usage_type: fetchLeaveUsageType,
  task_completion_rate: fetchTaskCompletionRate,
  team_task_progress: fetchTeamTaskProgress,
  headcount_department: fetchHeadcountDepartment,
  attendance_trend: fetchAttendanceTrend,
  payroll_cost_trend: fetchPayrollCostTrend,
  department_comparison: fetchDepartmentComparison,
  out_of_office: fetchOutOfOffice,
};

export default async function DashboardPage() {
  const roles = await getUserRoles();
  if (roles.length === 0) return null;

  let widgets = await getMyWidgets();
  if (widgets.length === 0) {
    await seedDefaultWidgets(roles);
    widgets = await getMyWidgets();
  }

  const uniqueTypes = Array.from(new Set(widgets.map((w) => w.widget_type)));
  const dataEntries = await Promise.all(
    uniqueTypes.map(async (type) => {
      const fetcher = WIDGET_FETCHERS[type];
      if (!fetcher) return [type, null] as const;
      try {
        const data = await fetcher();
        return [type, data] as const;
      } catch (err) {
        console.error(`Widget fetcher failed: ${type}`, err);
        return [type, null] as const;
      }
    }),
  );
  const widgetData = Object.fromEntries(dataEntries);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your personalized overview</p>
      </div>
      <DashboardGrid widgets={widgets} widgetData={widgetData} />
    </div>
  );
}
```

Key changes:
- Removed direct `createClient()` + `auth.getUser()` + `user_roles` query (3 queries)
- Uses `getUserRoles()` which is cached from the layout (0 extra queries)
- Each widget fetcher now also uses cached `getCompanyId()` / `getUserId()` (massive dedup)

- [ ] **Step 2: Verify build**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/app/\(portal\)/dashboard/page.tsx && git commit -m "perf: use cached helpers in dashboard page, eliminate redundant queries"
```

---

### Task 11: Create Export Utilities

**Files:**
- Create: `src/lib/utils/export-csv.ts`
- Create: `src/lib/utils/export-pdf.ts`

- [ ] **Step 1: Create CSV export utility**

```typescript
/**
 * Generate a CSV string from an array of objects.
 * Uses the keys of the first object as column headers.
 */
export function generateCsv<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; label: string }[],
): string {
  if (data.length === 0) return "";

  const cols = columns ?? Object.keys(data[0]).map((key) => ({ key: key as keyof T, label: key as string }));
  const header = cols.map((c) => `"${String(c.label)}"`).join(",");
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return "";
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        return String(val);
      })
      .join(","),
  );

  return [header, ...rows].join("\n");
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create PDF export utility**

```typescript
/**
 * Capture an HTML element and download as PDF.
 * Uses html2canvas + jsPDF for client-side rendering.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: {
    title?: string;
    orientation?: "portrait" | "landscape";
  },
): Promise<void> {
  const [html2canvas, { default: jsPDF }] = await Promise.all([
    import("html2canvas").then((m) => m.default),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const orientation = options?.orientation ?? "landscape";
  const pdf = new jsPDF(orientation, "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  if (options?.title) {
    pdf.setFontSize(16);
    pdf.text(options.title, margin, margin + 6);
    pdf.setFontSize(10);
    pdf.text(new Date().toLocaleDateString(), margin, margin + 14);
  }

  const topOffset = options?.title ? margin + 20 : margin;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - topOffset - margin;

  const imgWidth = availableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= availableHeight) {
    pdf.addImage(imgData, "PNG", margin, topOffset, imgWidth, imgHeight);
  } else {
    // Scale down to fit
    const scale = availableHeight / imgHeight;
    pdf.addImage(
      imgData,
      "PNG",
      margin,
      topOffset,
      imgWidth * scale,
      availableHeight,
    );
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/lib/utils/export-csv.ts src/lib/utils/export-pdf.ts && git commit -m "feat: add CSV and PDF export utilities"
```

---

### Task 12: Create Supabase RPC Migration — Attendance Analytics

**Files:**
- Create: `supabase/migrations/00064_rpc_attendance_analytics.sql`

This is the first RPC function. It replaces multiple client-side queries with a single database call.

- [ ] **Step 1: Write the migration**

```sql
-- Attendance analytics RPC function
-- Returns aggregated attendance metrics for a company within a date range

CREATE OR REPLACE FUNCTION rpc_attendance_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_department_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH filtered_employees AS (
    SELECT ed.profile_id, ed.department_id
    FROM employee_details ed
    WHERE ed.company_id = p_company_id
      AND (p_department_id IS NULL OR ed.department_id = p_department_id)
  ),
  attendance_data AS (
    SELECT
      das.date,
      das.status,
      das.is_late,
      fe.department_id
    FROM daily_attendance_summary das
    JOIN filtered_employees fe ON fe.profile_id = das.profile_id
    WHERE das.company_id = p_company_id
      AND das.date BETWEEN p_date_from AND p_date_to
  ),
  today_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'present') AS present_today,
      COUNT(*) FILTER (WHERE status = 'late') AS late_today,
      COUNT(*) FILTER (WHERE status IN ('absent', 'half_day')) AS absent_today,
      COUNT(*) AS total_today
    FROM attendance_data
    WHERE date = CURRENT_DATE
  ),
  month_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE is_late = true) AS late_count_month,
      COUNT(*) AS total_month,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('present', 'late'))::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS attendance_rate
    FROM attendance_data
  ),
  daily_trend AS (
    SELECT
      date,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('present', 'late'))::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS rate
    FROM attendance_data
    GROUP BY date
    ORDER BY date
  ),
  dept_breakdown AS (
    SELECT
      d.name AS department,
      COUNT(*) FILTER (WHERE ad.status IN ('present', 'late')) AS present,
      COUNT(*) FILTER (WHERE ad.is_late = true) AS late,
      COUNT(*) AS total,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE ad.status IN ('present', 'late'))::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS attendance_rate,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE ad.is_late = true)::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS late_rate
    FROM attendance_data ad
    JOIN departments d ON d.id = ad.department_id
    GROUP BY d.name
  )
  SELECT jsonb_build_object(
    'present_today', (SELECT present_today FROM today_stats),
    'late_today', (SELECT late_today FROM today_stats),
    'absent_today', (SELECT absent_today FROM today_stats),
    'total_today', (SELECT total_today FROM today_stats),
    'late_count_month', (SELECT late_count_month FROM month_stats),
    'attendance_rate', (SELECT attendance_rate FROM month_stats),
    'daily_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', date, 'rate', rate)) FROM daily_trend), '[]'::jsonb),
    'dept_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'department', department,
      'attendance_rate', attendance_rate,
      'late_rate', late_rate,
      'present', present,
      'late', late,
      'total', total
    )) FROM dept_breakdown), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 2: Test the migration locally**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx supabase db reset 2>&1 | tail -10
```

Or if using remote:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx supabase migration up --local 2>&1 | tail -10
```

Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add supabase/migrations/00064_rpc_attendance_analytics.sql && git commit -m "feat: add rpc_attendance_analytics database function"
```

---

### Task 13: Create Supabase RPC Migration — Leave Analytics

**Files:**
- Create: `supabase/migrations/00065_rpc_leave_analytics.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE OR REPLACE FUNCTION rpc_leave_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_department_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH filtered_employees AS (
    SELECT ed.profile_id, ed.department_id
    FROM employee_details ed
    WHERE ed.company_id = p_company_id
      AND (p_department_id IS NULL OR ed.department_id = p_department_id)
  ),
  leave_data AS (
    SELECT
      lr.id,
      lr.status,
      lr.total_days,
      lr.start_date,
      lr.end_date,
      lr.created_at,
      lr.leave_type_id,
      lt.name AS leave_type_name,
      fe.department_id
    FROM leave_requests lr
    JOIN filtered_employees fe ON fe.profile_id = lr.profile_id
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.start_date <= p_date_to AND lr.end_date >= p_date_from
  ),
  summary AS (
    SELECT
      COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'), 0) AS days_used,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count
    FROM leave_data
  ),
  usage_by_type AS (
    SELECT
      leave_type_name AS name,
      COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'), 0) AS days
    FROM leave_data
    GROUP BY leave_type_name
  ),
  balance_stats AS (
    SELECT
      COALESCE(SUM(lb.total_days), 0) AS total_allocated,
      COALESCE(SUM(lb.used_days), 0) AS total_used,
      COALESCE(SUM(lb.remaining_days), 0) AS total_remaining,
      CASE WHEN SUM(lb.total_days) > 0
        THEN ROUND(SUM(lb.used_days)::NUMERIC / SUM(lb.total_days) * 100, 1)
        ELSE 0
      END AS utilization_pct
    FROM leave_balances lb
    JOIN filtered_employees fe ON fe.profile_id = lb.profile_id
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  )
  SELECT jsonb_build_object(
    'days_used', (SELECT days_used FROM summary),
    'pending_count', (SELECT pending_count FROM summary),
    'approved_count', (SELECT approved_count FROM summary),
    'rejected_count', (SELECT rejected_count FROM summary),
    'utilization_pct', (SELECT utilization_pct FROM balance_stats),
    'total_allocated', (SELECT total_allocated FROM balance_stats),
    'total_remaining', (SELECT total_remaining FROM balance_stats),
    'usage_by_type', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'days', days)) FROM usage_by_type), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add supabase/migrations/00065_rpc_leave_analytics.sql && git commit -m "feat: add rpc_leave_analytics database function"
```

---

### Task 14: Create Supabase RPC Migration — Payroll Analytics

**Files:**
- Create: `supabase/migrations/00066_rpc_payroll_analytics.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE OR REPLACE FUNCTION rpc_payroll_analytics(
  p_company_id UUID,
  p_period_count INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH recent_periods AS (
    SELECT id, period_start, period_end, pay_date
    FROM payroll_periods
    WHERE company_id = p_company_id
    ORDER BY period_start DESC
    LIMIT p_period_count
  ),
  latest_period AS (
    SELECT id FROM recent_periods ORDER BY period_start DESC LIMIT 1
  ),
  period_totals AS (
    SELECT
      pp.period_start,
      COALESCE(SUM(pe.gross_pay), 0) AS total_gross,
      COALESCE(SUM(pe.net_pay), 0) AS total_net,
      COALESCE(SUM(pe.total_deductions), 0) AS total_deductions,
      COUNT(pe.id) AS employee_count
    FROM recent_periods pp
    LEFT JOIN payroll_entries pe ON pe.payroll_period_id = pp.id
    GROUP BY pp.period_start
    ORDER BY pp.period_start
  ),
  current_period_stats AS (
    SELECT
      COALESCE(SUM(pe.gross_pay), 0) AS total_gross,
      COALESCE(SUM(pe.net_pay), 0) AS total_net,
      COALESCE(SUM(pe.total_deductions), 0) AS total_deductions,
      COUNT(pe.id) AS employee_count,
      CASE WHEN COUNT(pe.id) > 0
        THEN ROUND(SUM(pe.net_pay)::NUMERIC / COUNT(pe.id), 2)
        ELSE 0
      END AS avg_salary
    FROM payroll_entries pe
    WHERE pe.payroll_period_id = (SELECT id FROM latest_period)
  ),
  dept_costs AS (
    SELECT
      d.name AS department,
      COALESCE(SUM(pe.net_pay), 0) AS net_pay,
      COUNT(pe.id) AS employee_count
    FROM payroll_entries pe
    JOIN employee_details ed ON ed.profile_id = pe.profile_id
    JOIN departments d ON d.id = ed.department_id
    WHERE pe.payroll_period_id = (SELECT id FROM latest_period)
    GROUP BY d.name
  )
  SELECT jsonb_build_object(
    'total_gross', (SELECT total_gross FROM current_period_stats),
    'total_net', (SELECT total_net FROM current_period_stats),
    'total_deductions', (SELECT total_deductions FROM current_period_stats),
    'employee_count', (SELECT employee_count FROM current_period_stats),
    'avg_salary', (SELECT avg_salary FROM current_period_stats),
    'period_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'period', period_start, 'gross', total_gross, 'net', total_net, 'deductions', total_deductions
    ) ORDER BY period_start) FROM period_totals), '[]'::jsonb),
    'dept_costs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'department', department, 'net_pay', net_pay, 'count', employee_count
    )) FROM dept_costs), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add supabase/migrations/00066_rpc_payroll_analytics.sql && git commit -m "feat: add rpc_payroll_analytics database function"
```

---

### Task 15: Create Supabase RPC Migrations — Employee, Workspace, Timesheet, Overtime, Approval, Form Analytics

**Files:**
- Create: `supabase/migrations/00067_rpc_employee_analytics.sql`
- Create: `supabase/migrations/00068_rpc_workspace_analytics.sql`
- Create: `supabase/migrations/00069_rpc_timesheet_analytics.sql`
- Create: `supabase/migrations/00070_rpc_overtime_analytics.sql`
- Create: `supabase/migrations/00071_rpc_approval_analytics.sql`
- Create: `supabase/migrations/00072_rpc_form_analytics.sql`

- [ ] **Step 1: Employee analytics migration**

```sql
CREATE OR REPLACE FUNCTION rpc_employee_analytics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH emp_data AS (
    SELECT
      ed.profile_id,
      ed.department_id,
      ed.job_level_id,
      ed.employment_status,
      ed.hire_date,
      d.name AS department_name,
      jl.name AS job_level_name
    FROM employee_details ed
    LEFT JOIN departments d ON d.id = ed.department_id
    LEFT JOIN job_levels jl ON jl.id = ed.job_level_id
    WHERE ed.company_id = p_company_id
  ),
  summary AS (
    SELECT
      COUNT(*) AS headcount,
      COUNT(*) FILTER (WHERE hire_date >= date_trunc('month', CURRENT_DATE)) AS new_hires_month,
      COUNT(*) FILTER (WHERE employment_status = 'probationary') AS probationary_count,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, hire_date)))::NUMERIC, 1)
        ELSE 0
      END AS avg_tenure_years
    FROM emp_data
    WHERE hire_date IS NOT NULL
  ),
  dept_breakdown AS (
    SELECT department_name AS name, COUNT(*) AS count
    FROM emp_data
    WHERE department_name IS NOT NULL
    GROUP BY department_name
    ORDER BY count DESC
  ),
  level_breakdown AS (
    SELECT job_level_name AS name, COUNT(*) AS count
    FROM emp_data
    WHERE job_level_name IS NOT NULL
    GROUP BY job_level_name
    ORDER BY count DESC
  ),
  status_breakdown AS (
    SELECT employment_status AS status, COUNT(*) AS count
    FROM emp_data
    WHERE employment_status IS NOT NULL
    GROUP BY employment_status
  )
  SELECT jsonb_build_object(
    'headcount', (SELECT headcount FROM summary),
    'new_hires_month', (SELECT new_hires_month FROM summary),
    'probationary_count', (SELECT probationary_count FROM summary),
    'avg_tenure_years', (SELECT avg_tenure_years FROM summary),
    'dept_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count)) FROM dept_breakdown), '[]'::jsonb),
    'level_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count)) FROM level_breakdown), '[]'::jsonb),
    'status_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', status, 'count', count)) FROM status_breakdown), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 2: Workspace analytics migration**

```sql
CREATE OR REPLACE FUNCTION rpc_workspace_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_folder_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH task_data AS (
    SELECT
      wt.id,
      wt.assignee_id,
      wt.created_at,
      wt.completed_at,
      wt.target_end_date,
      wt.priority,
      wfs.is_done,
      wfs.name AS status_name,
      wl.folder_id,
      p.first_name || ' ' || p.last_name AS assignee_name
    FROM workspace_tasks wt
    LEFT JOIN workspace_folder_statuses wfs ON wfs.id = wt.status_id
    LEFT JOIN workspace_lists wl ON wl.id = wt.list_id
    LEFT JOIN profiles p ON p.id = wt.assignee_id
    WHERE wt.company_id = p_company_id
      AND (p_folder_id IS NULL OR wl.folder_id = p_folder_id)
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE is_done = true) AS completed,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE target_end_date < CURRENT_DATE AND is_done IS DISTINCT FROM true) AS overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE is_done = true)::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS completion_rate
    FROM task_data
  ),
  workload AS (
    SELECT
      assignee_name AS name,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_done = true) AS completed
    FROM task_data
    WHERE assignee_id IS NOT NULL
    GROUP BY assignee_name
    ORDER BY total DESC
    LIMIT 15
  ),
  priority_pipeline AS (
    SELECT
      priority,
      COUNT(*) AS count,
      COUNT(*) FILTER (WHERE is_done = true) AS completed
    FROM task_data
    GROUP BY priority
  )
  SELECT jsonb_build_object(
    'completed', (SELECT completed FROM summary),
    'total', (SELECT total FROM summary),
    'overdue', (SELECT overdue FROM summary),
    'completion_rate', (SELECT completion_rate FROM summary),
    'workload', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'total', total, 'completed', completed)) FROM workload), '[]'::jsonb),
    'priority_pipeline', COALESCE((SELECT jsonb_agg(jsonb_build_object('priority', priority, 'count', count, 'completed', completed)) FROM priority_pipeline), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 3: Timesheet analytics migration**

```sql
CREATE OR REPLACE FUNCTION rpc_timesheet_analytics(
  p_company_id UUID,
  p_week_start DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH submissions AS (
    SELECT
      ts.profile_id,
      ts.status,
      ts.total_minutes,
      ed.department_id,
      d.name AS department_name
    FROM timesheet_submissions ts
    JOIN employee_details ed ON ed.profile_id = ts.profile_id
    LEFT JOIN departments d ON d.id = ed.department_id
    WHERE ts.company_id = p_company_id
      AND ts.week_start = p_week_start
  ),
  total_employees AS (
    SELECT COUNT(*) AS count FROM employee_details WHERE company_id = p_company_id
  ),
  summary AS (
    SELECT
      COUNT(*) AS submitted_count,
      ROUND(AVG(total_minutes)::NUMERIC / 60, 1) AS avg_hours,
      COUNT(*) FILTER (WHERE total_minutes > 2400) AS overtime_flags
    FROM submissions
  ),
  dept_utilization AS (
    SELECT
      department_name AS name,
      COUNT(*) AS submitted,
      ROUND(AVG(total_minutes)::NUMERIC / 60, 1) AS avg_hours
    FROM submissions
    WHERE department_name IS NOT NULL
    GROUP BY department_name
  )
  SELECT jsonb_build_object(
    'submitted_count', (SELECT submitted_count FROM summary),
    'total_employees', (SELECT count FROM total_employees),
    'submission_rate', CASE WHEN (SELECT count FROM total_employees) > 0
      THEN ROUND((SELECT submitted_count FROM summary)::NUMERIC / (SELECT count FROM total_employees) * 100, 1)
      ELSE 0 END,
    'avg_hours', (SELECT avg_hours FROM summary),
    'overtime_flags', (SELECT overtime_flags FROM summary),
    'non_submitters', (SELECT count FROM total_employees) - (SELECT submitted_count FROM summary),
    'dept_utilization', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'submitted', submitted, 'avg_hours', avg_hours)) FROM dept_utilization), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 4: Overtime analytics migration**

```sql
CREATE OR REPLACE FUNCTION rpc_overtime_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH ot_data AS (
    SELECT
      otr.id,
      otr.profile_id,
      otr.status,
      otr.total_hours,
      otr.date,
      otr.created_at,
      ed.department_id,
      d.name AS department_name
    FROM overtime_requests otr
    JOIN employee_details ed ON ed.profile_id = otr.profile_id
    LEFT JOIN departments d ON d.id = ed.department_id
    WHERE otr.company_id = p_company_id
      AND otr.date BETWEEN p_date_from AND p_date_to
  ),
  summary AS (
    SELECT
      COALESCE(SUM(total_hours) FILTER (WHERE status = 'approved'), 0) AS total_hours,
      COUNT(*) AS total_requests,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS approval_rate
    FROM ot_data
  ),
  dept_distribution AS (
    SELECT
      department_name AS name,
      COALESCE(SUM(total_hours) FILTER (WHERE status = 'approved'), 0) AS hours,
      COUNT(*) AS requests
    FROM ot_data
    WHERE department_name IS NOT NULL
    GROUP BY department_name
    ORDER BY hours DESC
  ),
  monthly_trend AS (
    SELECT
      to_char(date, 'YYYY-MM') AS month,
      COALESCE(SUM(total_hours) FILTER (WHERE status = 'approved'), 0) AS hours,
      COUNT(*) AS requests
    FROM ot_data
    GROUP BY to_char(date, 'YYYY-MM')
    ORDER BY month
  )
  SELECT jsonb_build_object(
    'total_hours', (SELECT total_hours FROM summary),
    'total_requests', (SELECT total_requests FROM summary),
    'approval_rate', (SELECT approval_rate FROM summary),
    'top_department', (SELECT name FROM dept_distribution LIMIT 1),
    'dept_distribution', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'hours', hours, 'requests', requests)) FROM dept_distribution), '[]'::jsonb),
    'monthly_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', month, 'hours', hours, 'requests', requests)) FROM monthly_trend), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 5: Approval analytics migration**

```sql
CREATE OR REPLACE FUNCTION rpc_approval_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH approval_data AS (
    SELECT
      ar.id,
      ar.status,
      ar.created_at,
      ar.updated_at,
      EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at)) / 3600 AS hours_to_resolve
    FROM approval_requests ar
    WHERE ar.company_id = p_company_id
      AND ar.created_at BETWEEN p_date_from AND p_date_to
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      ROUND(AVG(hours_to_resolve) FILTER (WHERE status IN ('approved', 'rejected'))::NUMERIC, 1) AS avg_hours_to_resolve,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
      MAX(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600) FILTER (WHERE status = 'pending') AS oldest_pending_hours
    FROM approval_data
  ),
  pending_by_step AS (
    SELECT
      p.first_name || ' ' || p.last_name AS approver_name,
      COUNT(*) AS pending_count
    FROM approval_steps aps
    JOIN approval_requests ar ON ar.id = aps.request_id
    JOIN profiles p ON p.id = aps.approver_id
    WHERE ar.company_id = p_company_id
      AND aps.status = 'pending'
    GROUP BY approver_name
    ORDER BY pending_count DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'pending_count', (SELECT COALESCE(pending_count, 0) FROM summary),
    'avg_hours_to_resolve', (SELECT COALESCE(avg_hours_to_resolve, 0) FROM summary),
    'approved_count', (SELECT COALESCE(approved_count, 0) FROM summary),
    'rejected_count', (SELECT COALESCE(rejected_count, 0) FROM summary),
    'oldest_pending_hours', (SELECT COALESCE(ROUND(oldest_pending_hours::NUMERIC, 1), 0) FROM summary),
    'bottlenecks', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', approver_name, 'pending', pending_count)) FROM pending_by_step), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 6: Form analytics migration**

```sql
CREATE OR REPLACE FUNCTION rpc_form_analytics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH form_data AS (
    SELECT
      f.id,
      f.title,
      f.status AS form_status,
      COUNT(fa.id) AS total_assigned,
      COUNT(fs.id) AS total_submitted,
      COUNT(fa.id) FILTER (WHERE fa.status = 'pending') AS pending_count
    FROM forms f
    LEFT JOIN form_assignments fa ON fa.form_id = f.id
    LEFT JOIN form_submissions fs ON fs.form_id = f.id AND fs.profile_id = fa.profile_id
    WHERE f.company_id = p_company_id
    GROUP BY f.id, f.title, f.status
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE form_status = 'active') AS active_count,
      COALESCE(SUM(pending_count), 0) AS total_pending,
      CASE WHEN SUM(total_assigned) > 0
        THEN ROUND(SUM(total_submitted)::NUMERIC / SUM(total_assigned) * 100, 1)
        ELSE 0
      END AS response_rate
    FROM form_data
  ),
  per_form AS (
    SELECT
      title,
      total_assigned,
      total_submitted,
      CASE WHEN total_assigned > 0
        THEN ROUND(total_submitted::NUMERIC / total_assigned * 100, 1)
        ELSE 0
      END AS submission_rate
    FROM form_data
    WHERE form_status = 'active'
    ORDER BY submission_rate ASC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'active_count', (SELECT active_count FROM summary),
    'total_pending', (SELECT total_pending FROM summary),
    'response_rate', (SELECT response_rate FROM summary),
    'per_form', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'title', title, 'assigned', total_assigned, 'submitted', total_submitted, 'rate', submission_rate
    )) FROM per_form), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
```

- [ ] **Step 7: Commit all migrations**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add supabase/migrations/00067_rpc_employee_analytics.sql supabase/migrations/00068_rpc_workspace_analytics.sql supabase/migrations/00069_rpc_timesheet_analytics.sql supabase/migrations/00070_rpc_overtime_analytics.sql supabase/migrations/00071_rpc_approval_analytics.sql supabase/migrations/00072_rpc_form_analytics.sql && git commit -m "feat: add RPC functions for employee, workspace, timesheet, overtime, approval, form analytics"
```

---

### Task 16: Create Analytics Action Layer

**Files:**
- Create: `src/lib/actions/analytics.ts`

- [ ] **Step 1: Create the analytics action file**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { getCompanyId, getUserRoles, getDateRange, hasRole } from "@/lib/actions/helpers";
import type { RoleName } from "@/types";

const ADMIN_ROLES: RoleName[] = ["admin", "hr", "director", "business_manager"];
const MANAGER_ROLES: RoleName[] = [...ADMIN_ROLES, "dept_manager", "team_leader"];

export async function fetchAttendanceAnalytics(dateFrom?: string, dateTo?: string, departmentId?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_attendance_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
    p_department_id: departmentId ?? null,
  });

  if (error) {
    console.error("rpc_attendance_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchLeaveAnalytics(dateFrom?: string, dateTo?: string, departmentId?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_leave_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
    p_department_id: departmentId ?? null,
  });

  if (error) {
    console.error("rpc_leave_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchPayrollAnalytics(periodCount?: number) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, ADMIN_ROLES)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_payroll_analytics", {
    p_company_id: companyId,
    p_period_count: periodCount ?? 6,
  });

  if (error) {
    console.error("rpc_payroll_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchEmployeeAnalytics() {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_employee_analytics", {
    p_company_id: companyId,
  });

  if (error) {
    console.error("rpc_employee_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchWorkspaceAnalytics(dateFrom?: string, dateTo?: string, folderId?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_workspace_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
    p_folder_id: folderId ?? null,
  });

  if (error) {
    console.error("rpc_workspace_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchTimesheetAnalytics(weekStart?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const ws = weekStart ?? (() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split("T")[0];
  })();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_timesheet_analytics", {
    p_company_id: companyId,
    p_week_start: ws,
  });

  if (error) {
    console.error("rpc_timesheet_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchOvertimeAnalytics(dateFrom?: string, dateTo?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_overtime_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
  });

  if (error) {
    console.error("rpc_overtime_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchApprovalAnalytics(dateFrom?: string, dateTo?: string) {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, MANAGER_ROLES)) return null;

  const { start, end } = dateFrom && dateTo
    ? { start: dateFrom, end: dateTo }
    : getDateRange("this_month");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_approval_analytics", {
    p_company_id: companyId,
    p_date_from: start,
    p_date_to: end,
  });

  if (error) {
    console.error("rpc_approval_analytics error:", error);
    return null;
  }
  return data;
}

export async function fetchFormAnalytics() {
  const [companyId, roles] = await Promise.all([getCompanyId(), getUserRoles()]);
  if (!companyId || !hasRole(roles, ADMIN_ROLES)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_form_analytics", {
    p_company_id: companyId,
  });

  if (error) {
    console.error("rpc_form_analytics error:", error);
    return null;
  }
  return data;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1 | head -20
```

Note: The `.rpc()` calls may produce type errors because the RPC functions aren't in the generated database types yet. This is expected — types will be regenerated after migrations are applied.

- [ ] **Step 3: Commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add src/lib/actions/analytics.ts && git commit -m "feat: add centralized analytics action layer calling Supabase RPC functions"
```

---

### Task 17: Full Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npx tsc --noEmit 2>&1
```

Fix any type errors.

- [ ] **Step 2: Run lint**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npm run lint 2>&1
```

Fix any lint issues.

- [ ] **Step 3: Run tests**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npm test 2>&1
```

All existing tests should pass.

- [ ] **Step 4: Run build**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && npm run build 2>&1
```

Expected: Build succeeds. Fix any issues.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal && git add -A && git commit -m "fix: resolve build issues from infrastructure optimization"
```
