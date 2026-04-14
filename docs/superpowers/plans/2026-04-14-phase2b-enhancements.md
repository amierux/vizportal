# Phase 2B Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add company timezone, non-working days, overtime module, configurable approval chains with per-type enable/disable and custom approver steps, leave reliever system, and attachment uploads to manual clock and leave request forms.

**Architecture:** 7 new migrations extending the existing schema. Approval engine refactored to read configurable chains from `approval_configs`/`approval_config_steps` instead of hardcoded TL→DM. New overtime module follows the same pattern as leave (server actions, components, page with records tabs). Reliever system adds a multi-approver first step to leave approvals. All timezone references made dynamic via company setting.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth, Storage), Tailwind + shadcn/ui, Zod, Vitest, Resend

**Spec:** `docs/superpowers/specs/2026-04-14-phase2b-enhancements-design.md`

---

## File Structure

```
vizportal/
├── supabase/migrations/
│   ├── 00028_add_company_timezone.sql
│   ├── 00029_create_non_working_days.sql
│   ├── 00030_create_overtime_requests.sql
│   ├── 00031_create_approval_configs.sql
│   ├── 00032_add_leave_reliever.sql
│   ├── 00033_add_clock_entry_attachment.sql
│   └── 00034_seed_approval_configs.sql
├── src/
│   ├── app/(portal)/
│   │   ├── overtime/page.tsx                          # NEW — My Overtime + records
│   │   └── settings/attendance/page.tsx               # NEW — Non-working days
│   ├── components/
│   │   ├── overtime/
│   │   │   ├── overtime-request-form.tsx               # NEW
│   │   │   ├── overtime-requests-table.tsx             # NEW
│   │   │   └── overtime-records.tsx                    # NEW
│   │   ├── leave/
│   │   │   ├── reliever-input.tsx                      # NEW — autocomplete user + tasks
│   │   │   ├── leave-request-form.tsx                  # MODIFY — add relievers + attachment
│   │   │   └── leave-type-table.tsx                    # MODIFY — add requires_reliever toggle
│   │   ├── attendance/
│   │   │   ├── manual-clock-dialog.tsx                 # MODIFY — add attachment upload
│   │   │   └── non-working-days-table.tsx              # NEW
│   │   ├── settings/
│   │   │   ├── approval-settings-form.tsx              # MODIFY — approval chain config per type
│   │   │   └── settings-nav.tsx                        # MODIFY — add Attendance tab
│   │   └── company/
│   │       └── company-form.tsx                        # MODIFY — add timezone dropdown
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── approvals.ts                            # MODIFY — configurable chains
│   │   │   ├── approval-configs.ts                     # NEW
│   │   │   ├── overtime.ts                             # NEW
│   │   │   ├── non-working-days.ts                     # NEW
│   │   │   ├── leave.ts                                # MODIFY — relievers
│   │   │   └── attendance.ts                           # MODIFY — attachment
│   │   ├── validations/
│   │   │   ├── overtime.ts                             # NEW
│   │   │   └── leave.ts                                # MODIFY — reliever schema
│   │   └── utils/
│   │       └── timezone.ts                             # NEW — getCompanyTimezone
│   └── types/
│       ├── database.ts                                 # MODIFY — 5 new tables + columns
│       └── index.ts                                    # MODIFY — new type aliases
```

---

## Task 1: Database Migrations

**Files:**
- Create: 7 migration files in `vizportal/supabase/migrations/`

- [ ] **Step 1: Create migration 00028 — company timezone + holiday country**

Create `vizportal/supabase/migrations/00028_add_company_timezone.sql`:

```sql
ALTER TABLE companies ADD COLUMN timezone TEXT DEFAULT 'Asia/Singapore' NOT NULL;
ALTER TABLE companies ADD COLUMN holiday_country TEXT DEFAULT 'PH' NOT NULL;
```

- [ ] **Step 2: Create migration 00029 — non_working_days**

Create `vizportal/supabase/migrations/00029_create_non_working_days.sql`:

```sql
CREATE TABLE non_working_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  country TEXT DEFAULT 'PH' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_non_working_days_company_id ON non_working_days(company_id);
CREATE INDEX idx_non_working_days_company_date ON non_working_days(company_id, date);

ALTER TABLE non_working_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non working days"
  ON non_working_days FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage non working days"
  ON non_working_days FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));
```

- [ ] **Step 3: Create migration 00030 — overtime_requests**

Create `vizportal/supabase/migrations/00030_create_overtime_requests.sql`:

```sql
CREATE TABLE overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_overtime_requests_company_id ON overtime_requests(company_id);
CREATE INDEX idx_overtime_requests_profile_id ON overtime_requests(profile_id);
CREATE INDEX idx_overtime_requests_profile_date ON overtime_requests(profile_id, date);

CREATE TRIGGER overtime_requests_updated_at
  BEFORE UPDATE ON overtime_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can view all overtime requests"
  ON overtime_requests FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "TL/DM can view own dept overtime requests"
  ON overtime_requests FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can view own overtime requests"
  ON overtime_requests FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own overtime requests"
  ON overtime_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Users can update own pending overtime requests"
  ON overtime_requests FOR UPDATE
  USING (profile_id = auth.uid() AND status = 'pending')
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin/HR can update overtime requests"
  ON overtime_requests FOR UPDATE
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));
```

- [ ] **Step 4: Create migration 00031 — approval_configs + approval_config_steps**

Create `vizportal/supabase/migrations/00031_create_approval_configs.sql`:

```sql
CREATE TABLE approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, type)
);

CREATE TRIGGER approval_configs_updated_at
  BEFORE UPDATE ON approval_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE approval_config_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_config_id UUID REFERENCES approval_configs(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_approval_config_steps_config ON approval_config_steps(approval_config_id);

ALTER TABLE approval_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_config_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view approval configs"
  ON approval_configs FOR SELECT
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can manage approval configs"
  ON approval_configs FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Users can view approval configs for processing"
  ON approval_configs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can view approval config steps"
  ON approval_config_steps FOR SELECT
  USING (
    approval_config_id IN (
      SELECT id FROM approval_configs WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "Admin can manage approval config steps"
  ON approval_config_steps FOR ALL
  USING (
    approval_config_id IN (
      SELECT id FROM approval_configs WHERE company_id = get_user_company_id() AND has_role('admin')
    )
  );
```

- [ ] **Step 5: Create migration 00032 — leave reliever**

Create `vizportal/supabase/migrations/00032_add_leave_reliever.sql`:

```sql
ALTER TABLE leave_types ADD COLUMN requires_reliever BOOLEAN DEFAULT false NOT NULL;

CREATE TABLE leave_request_relievers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE NOT NULL,
  reliever_id UUID REFERENCES profiles(id) NOT NULL,
  tasks TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_leave_request_relievers_request ON leave_request_relievers(leave_request_id);
CREATE INDEX idx_leave_request_relievers_reliever ON leave_request_relievers(reliever_id);

ALTER TABLE leave_request_relievers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own request relievers"
  ON leave_request_relievers FOR SELECT
  USING (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Relievers can view assigned relievers"
  ON leave_request_relievers FOR SELECT
  USING (reliever_id = auth.uid());

CREATE POLICY "Admin/HR can view all relievers"
  ON leave_request_relievers FOR SELECT
  USING (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE company_id = get_user_company_id()
    )
    AND has_any_role(ARRAY['admin', 'hr'])
  );

CREATE POLICY "Users can insert own request relievers"
  ON leave_request_relievers FOR INSERT
  WITH CHECK (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE profile_id = auth.uid()
    )
  );
```

- [ ] **Step 6: Create migration 00033 — clock entry attachment**

Create `vizportal/supabase/migrations/00033_add_clock_entry_attachment.sql`:

```sql
ALTER TABLE clock_entries ADD COLUMN attachment_url TEXT;
```

- [ ] **Step 7: Create migration 00034 — seed approval configs function**

Create `vizportal/supabase/migrations/00034_seed_approval_configs.sql`:

```sql
CREATE OR REPLACE FUNCTION seed_company_approval_configs(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_manual_config_id UUID;
  v_leave_config_id UUID;
  v_overtime_config_id UUID;
BEGIN
  -- Manual clock approval
  INSERT INTO approval_configs (company_id, type, is_enabled)
  VALUES (p_company_id, 'manual_clock', true)
  ON CONFLICT (company_id, type) DO NOTHING
  RETURNING id INTO v_manual_config_id;

  IF v_manual_config_id IS NOT NULL THEN
    INSERT INTO approval_config_steps (approval_config_id, step_order, role, is_optional) VALUES
      (v_manual_config_id, 1, 'team_leader', false),
      (v_manual_config_id, 2, 'dept_manager', false);
  END IF;

  -- Leave approval
  INSERT INTO approval_configs (company_id, type, is_enabled)
  VALUES (p_company_id, 'leave_request', true)
  ON CONFLICT (company_id, type) DO NOTHING
  RETURNING id INTO v_leave_config_id;

  IF v_leave_config_id IS NOT NULL THEN
    INSERT INTO approval_config_steps (approval_config_id, step_order, role, is_optional) VALUES
      (v_leave_config_id, 1, 'reliever', false),
      (v_leave_config_id, 2, 'team_leader', false),
      (v_leave_config_id, 3, 'dept_manager', false);
  END IF;

  -- Overtime approval
  INSERT INTO approval_configs (company_id, type, is_enabled)
  VALUES (p_company_id, 'overtime', true)
  ON CONFLICT (company_id, type) DO NOTHING
  RETURNING id INTO v_overtime_config_id;

  IF v_overtime_config_id IS NOT NULL THEN
    INSERT INTO approval_config_steps (approval_config_id, step_order, role, is_optional) VALUES
      (v_overtime_config_id, 1, 'team_leader', false),
      (v_overtime_config_id, 2, 'dept_manager', false),
      (v_overtime_config_id, 3, 'business_manager', true),
      (v_overtime_config_id, 4, 'director', true);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 8: Push migrations + seed**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npx supabase db push
npx supabase db query --linked "SELECT seed_company_approval_configs('a0000000-0000-4000-8000-000000000001');"
```

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add Phase 2B migrations — timezone, holidays, overtime, approval configs, relievers, attachments"
```

---

## Task 2: Update Database Types

**Files:**
- Modify: `vizportal/src/types/database.ts`
- Modify: `vizportal/src/types/index.ts`

- [ ] **Step 1: Add new columns to companies type**

In `database.ts`, add to companies Row (after `favicon_url`):
```typescript
          timezone: string;
          holiday_country: string;
```
Add to companies Insert:
```typescript
          timezone?: string;
          holiday_country?: string;
```
Add to companies Update:
```typescript
          timezone?: string;
          holiday_country?: string;
```

- [ ] **Step 2: Add attachment_url to clock_entries type**

Add `attachment_url: string | null;` to clock_entries Row (after `manual_remarks`).
Add `attachment_url?: string | null;` to clock_entries Insert and Update.

- [ ] **Step 3: Add requires_reliever to leave_types type**

Add `requires_reliever: boolean;` to leave_types Row (after `is_active`).
Add `requires_reliever?: boolean;` to leave_types Insert and Update.

- [ ] **Step 4: Add 5 new table types**

Add inside `Database["public"]["Tables"]`:

```typescript
      non_working_days: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          date: string;
          is_recurring: boolean;
          country: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          date: string;
          is_recurring?: boolean;
          country?: string;
        };
        Update: {
          name?: string;
          date?: string;
          is_recurring?: boolean;
          country?: string;
        };
        Relationships: [];
      };
      overtime_requests: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          date: string;
          start_time: string;
          end_time: string;
          total_hours: number;
          reason: string;
          attachment_url: string | null;
          status: "pending" | "approved" | "rejected" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          date: string;
          start_time: string;
          end_time: string;
          total_hours: number;
          reason: string;
          attachment_url?: string | null;
          status?: "pending" | "approved" | "rejected" | "cancelled";
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "cancelled";
          attachment_url?: string | null;
        };
        Relationships: [];
      };
      approval_configs: {
        Row: {
          id: string;
          company_id: string;
          type: string;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: string;
          is_enabled?: boolean;
        };
        Update: {
          is_enabled?: boolean;
        };
        Relationships: [];
      };
      approval_config_steps: {
        Row: {
          id: string;
          approval_config_id: string;
          step_order: number;
          role: string;
          is_optional: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          approval_config_id: string;
          step_order: number;
          role: string;
          is_optional?: boolean;
        };
        Update: {
          step_order?: number;
          role?: string;
          is_optional?: boolean;
        };
        Relationships: [];
      };
      leave_request_relievers: {
        Row: {
          id: string;
          leave_request_id: string;
          reliever_id: string;
          tasks: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          leave_request_id: string;
          reliever_id: string;
          tasks: string;
        };
        Update: {
          tasks?: string;
        };
        Relationships: [];
      };
```

- [ ] **Step 5: Add type aliases to index.ts**

```typescript
export type NonWorkingDay = Database["public"]["Tables"]["non_working_days"]["Row"];
export type OvertimeRequest = Database["public"]["Tables"]["overtime_requests"]["Row"];
export type ApprovalConfig = Database["public"]["Tables"]["approval_configs"]["Row"];
export type ApprovalConfigStep = Database["public"]["Tables"]["approval_config_steps"]["Row"];
export type LeaveRequestReliever = Database["public"]["Tables"]["leave_request_relievers"]["Row"];
```

- [ ] **Step 6: Add routes and page titles**

Add to `ROUTE_ROLE_MAP` in `src/lib/constants.ts`:
```typescript
  "/overtime": [],
  "/settings/attendance": ["admin"],
```

Add to `getPageTitle` in `src/components/layout/header.tsx`:
```typescript
    "/overtime": "Overtime",
    "/settings/attendance": "Attendance Settings",
```

Add "Attendance" tab to `SETTINGS_NAV` in `src/components/settings/settings-nav.tsx` (after "Employees"):
```typescript
  { label: "Attendance", href: "/settings/attendance", roles: ["admin"] },
```

Add "Overtime" to sidebar in `src/components/layout/sidebar.tsx` (after Leave, before Approvals) — import `Timer` from lucide-react:
```typescript
  { label: "Overtime", href: "/overtime", icon: Timer, roles: [] },
```

- [ ] **Step 7: Verify build + commit**

```bash
npm run build
git add src/types/ src/lib/constants.ts src/components/layout/header.tsx src/components/settings/settings-nav.tsx src/components/layout/sidebar.tsx
git commit -m "feat: add Phase 2B types, routes, and navigation"
```

---

## Task 3: Company Timezone Utility + Company Form Update

**Files:**
- Create: `vizportal/src/lib/utils/timezone.ts`
- Modify: `vizportal/src/components/company/company-form.tsx`
- Modify: `vizportal/src/lib/validations/company.ts`

- [ ] **Step 1: Create timezone utility**

Create `vizportal/src/lib/utils/timezone.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const FALLBACK_TIMEZONE = "Asia/Singapore";

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
  { value: "Asia/Manila", label: "Manila (PHT, UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST, UTC+9)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT, UTC+8)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST, UTC+8)" },
  { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
  { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
  { value: "Australia/Sydney", label: "Sydney (AEST, UTC+10)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST, UTC+12)" },
  { value: "UTC", label: "UTC" },
] as const;

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get company timezone. Used by server actions and cron jobs.
 * Falls back to Asia/Singapore if not found.
 */
export async function getCompanyTimezone(companyId?: string): Promise<string> {
  try {
    const supabase = createAdminClient();

    let query = supabase.from("companies").select("timezone");

    if (companyId) {
      query = query.eq("id", companyId);
    }

    const { data } = await query.limit(1).single();
    return data?.timezone ?? FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}
```

- [ ] **Step 2: Update company validation schema**

In `src/lib/validations/company.ts`, add to companySchema:
```typescript
  timezone: z.string().optional(),
  holiday_country: z.string().optional(),
```

- [ ] **Step 3: Update company form — add timezone + holiday country dropdowns**

In `src/components/company/company-form.tsx`, add timezone and holiday country fields. Import `TIMEZONE_OPTIONS` from `@/lib/utils/timezone`. Add after the favicon upload section:

```typescript
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select name="timezone" defaultValue={company.timezone ?? "Asia/Singapore"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="holiday_country">Holiday Country</Label>
          <Select name="holiday_country" defaultValue={company.holiday_country ?? "PH"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PH">Philippines</SelectItem>
              <SelectItem value="SG">Singapore</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="AU">Australia</SelectItem>
              <SelectItem value="JP">Japan</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
```

Also update the `updateCompany` action in `src/lib/actions/company.ts` to include `timezone` and `holiday_country` in the parsed data.

- [ ] **Step 4: Verify build + commit**

```bash
npm run build
git add src/lib/utils/timezone.ts src/lib/validations/company.ts src/components/company/company-form.tsx src/lib/actions/company.ts
git commit -m "feat: add company timezone and holiday country settings"
```

---

## Task 4: Non-Working Days Module

**Files:**
- Create: `vizportal/src/lib/actions/non-working-days.ts`
- Create: `vizportal/src/components/attendance/non-working-days-table.tsx`
- Create: `vizportal/src/app/(portal)/settings/attendance/page.tsx`

- [ ] **Step 1: Create server actions**

Create `vizportal/src/lib/actions/non-working-days.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getNonWorkingDays() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("non_working_days")
    .select("*")
    .order("date", { ascending: false });
  return data ?? [];
}

export async function createNonWorkingDay(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const name = formData.get("name") as string;
  const date = formData.get("date") as string;
  const isRecurring = formData.get("is_recurring") === "true";
  const country = (formData.get("country") as string) || "PH";

  if (!name || !date) return { error: "Name and date are required" };

  const { error } = await supabase.from("non_working_days").insert({
    company_id: profile.company_id,
    name,
    date,
    is_recurring: isRecurring,
    country,
  });

  if (error) return { error: "Failed to create non-working day" };

  revalidatePath("/settings/attendance");
  return { success: true };
}

export async function deleteNonWorkingDay(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("non_working_days")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete" };

  revalidatePath("/settings/attendance");
  return { success: true };
}

/**
 * Check if a given date is a non-working day for a company.
 * Checks both exact date matches and recurring (month+day) matches.
 */
export async function isNonWorkingDay(companyId: string, date: string): Promise<boolean> {
  const supabase = await createClient();

  const dateObj = new Date(date);
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  // Check exact date
  const { data: exact } = await supabase
    .from("non_working_days")
    .select("id")
    .eq("company_id", companyId)
    .eq("date", date)
    .eq("is_recurring", false)
    .limit(1);

  if (exact && exact.length > 0) return true;

  // Check recurring (any year with same month+day)
  const { data: all } = await supabase
    .from("non_working_days")
    .select("date")
    .eq("company_id", companyId)
    .eq("is_recurring", true);

  if (all) {
    for (const nwd of all) {
      const nwdDate = new Date(nwd.date);
      if (nwdDate.getMonth() + 1 === month && nwdDate.getDate() === day) {
        return true;
      }
    }
  }

  return false;
}
```

- [ ] **Step 2: Create non-working days table component**

Create `vizportal/src/components/attendance/non-working-days-table.tsx`:

```typescript
"use client";

import { useActionState, useEffect, useState } from "react";
import { createNonWorkingDay, deleteNonWorkingDay } from "@/lib/actions/non-working-days";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import type { NonWorkingDay } from "@/types";

type NonWorkingDaysTableProps = {
  days: NonWorkingDay[];
};

export function NonWorkingDaysTable({ days }: NonWorkingDaysTableProps) {
  const [state, formAction, isPending] = useActionState(createNonWorkingDay, null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Non-working day added");
      setOpen(false);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  async function handleDelete(id: string) {
    const result = await deleteNonWorkingDay(id);
    if ("error" in result) toast.error(result.error);
    else toast.success("Deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Non-Working Day</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Non-Working Day</DialogTitle></DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" placeholder="e.g., Christmas Day" required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input name="date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select name="country" defaultValue="PH">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PH">Philippines</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="hidden" name="is_recurring" value="false" />
                <input type="checkbox" name="is_recurring" value="true" className="rounded" />
                Repeats every year
              </label>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Recurring</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No non-working days configured
              </TableCell>
            </TableRow>
          ) : (
            days.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{formatDate(d.date)}</TableCell>
                <TableCell><Badge variant="outline">{d.country}</Badge></TableCell>
                <TableCell>{d.is_recurring ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create attendance settings page**

Create `vizportal/src/app/(portal)/settings/attendance/page.tsx`:

```typescript
import { getNonWorkingDays } from "@/lib/actions/non-working-days";
import { NonWorkingDaysTable } from "@/components/attendance/non-working-days-table";

export default async function AttendanceSettingsPage() {
  const days = await getNonWorkingDays();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Attendance Settings</h1>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Non-Working Days</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Holidays and non-working days. Employees will not be marked absent on these dates.
        </p>
        <NonWorkingDaysTable days={days} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build + commit**

```bash
npm run build
git add src/lib/actions/non-working-days.ts src/components/attendance/non-working-days-table.tsx src/app/\(portal\)/settings/attendance/
git commit -m "feat: add non-working days management in attendance settings"
```

---

## Task 5: Update Mark-Absences Cron to Skip Non-Working Days

**Files:**
- Modify: `vizportal/src/app/api/cron/mark-absences/route.ts`

- [ ] **Step 1: Update cron to check non-working days**

Import `isNonWorkingDay` and add a check before marking absent. After getting today's date and before iterating schedules, add the non-working day check inside the loop:

```typescript
// After: if (existing) continue;
// Add:
// Check if today is a non-working day
const { data: nwdExact } = await supabase
  .from("non_working_days")
  .select("id, date, is_recurring")
  .eq("company_id", sched.company_id);

const todayDate = new Date(today);
const todayMonth = todayDate.getMonth() + 1;
const todayDay = todayDate.getDate();

const isHoliday = (nwdExact ?? []).some((nwd) => {
  if (!nwd.is_recurring) return nwd.date === today;
  const nwdDate = new Date(nwd.date);
  return nwdDate.getMonth() + 1 === todayMonth && nwdDate.getDate() === todayDay;
});

if (isHoliday) continue;
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/app/api/cron/mark-absences/route.ts
git commit -m "feat: mark-absences cron skips non-working days"
```

---

## Task 6: Approval Config Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/approval-configs.ts`

- [ ] **Step 1: Create approval config actions**

Create `vizportal/src/lib/actions/approval-configs.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Get all approval configs + steps for the company.
 */
export async function getApprovalConfigs() {
  const supabase = await createClient();

  const { data: configs } = await supabase
    .from("approval_configs")
    .select("*, approval_config_steps(*)")
    .order("type");

  // Sort steps by step_order within each config
  return (configs ?? []).map((config) => ({
    ...config,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approval_config_steps: ((config as any).approval_config_steps ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.step_order - b.step_order
    ),
  }));
}

/**
 * Update an approval config: toggle enabled + replace steps.
 */
export async function updateApprovalConfig(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const type = formData.get("_type") as string;
  const isEnabled = formData.get("is_enabled") === "true";
  const stepsJson = formData.get("_steps") as string;

  let steps: { role: string; is_optional: boolean }[] = [];
  try {
    steps = JSON.parse(stepsJson);
  } catch {
    return { error: "Invalid steps data" };
  }

  // Upsert config
  const { data: existing } = await supabase
    .from("approval_configs")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("type", type)
    .single();

  let configId: string;

  if (existing) {
    await supabase
      .from("approval_configs")
      .update({ is_enabled: isEnabled })
      .eq("id", existing.id);
    configId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("approval_configs")
      .insert({
        company_id: profile.company_id,
        type,
        is_enabled: isEnabled,
      })
      .select("id")
      .single();
    if (error || !created) return { error: "Failed to save config" };
    configId = created.id;
  }

  // Delete old steps and insert new ones
  await supabase
    .from("approval_config_steps")
    .delete()
    .eq("approval_config_id", configId);

  for (let i = 0; i < steps.length; i++) {
    await supabase.from("approval_config_steps").insert({
      approval_config_id: configId,
      step_order: i + 1,
      role: steps[i].role,
      is_optional: steps[i].is_optional,
    });
  }

  revalidatePath("/settings/approval");
  return { success: true };
}
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/lib/actions/approval-configs.ts
git commit -m "feat: add approval config server actions — get and update chains"
```

---

## Task 7: Refactor Approval Engine for Configurable Chains

**Files:**
- Modify: `vizportal/src/lib/actions/approvals.ts`

This is the most complex task. The `createApprovalRequest` function must be refactored to:
1. Accept `'overtime'` as a type (in addition to existing types)
2. Read `approval_configs` + `approval_config_steps` for the type
3. If disabled, auto-approve immediately
4. If enabled, resolve each step's role to actual user IDs
5. Handle reliever steps (multiple approvers per step from `leave_request_relievers`)

The `applyApprovalSideEffects` and `applyRejectionSideEffects` must also handle `'overtime'` type.

*Complete refactored code for createApprovalRequest, including all the role resolution logic, auto-approve path, and reliever handling. Also update the type parameter to accept 'overtime' and add overtime side effects.*

- [ ] **Step 1: Refactor createApprovalRequest**

Read the full current file, then replace the `createApprovalRequest` function. The key changes:
- Type param becomes `"manual_clock" | "leave_request" | "overtime"`
- Add optional `relievers` param for leave requests
- Read approval config + steps from DB
- Auto-approve path when disabled
- Role-to-user resolution with fallback
- Reliever step creates multiple approval_steps with same step_order

- [ ] **Step 2: Update side effects for overtime**

Add to `applyApprovalSideEffects`:
```typescript
  } else if (type === "overtime") {
    await supabase
      .from("overtime_requests")
      .update({ status: "approved" })
      .eq("id", referenceId);
  }
```

Add to `applyRejectionSideEffects`:
```typescript
  } else if (type === "overtime") {
    await supabase
      .from("overtime_requests")
      .update({ status: "rejected" })
      .eq("id", referenceId);
  }
```

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/lib/actions/approvals.ts
git commit -m "feat: refactor approval engine for configurable chains — auto-approve, role resolution, relievers"
```

---

## Task 8: Approval Settings UI — Configurable Chains

**Files:**
- Modify: `vizportal/src/components/settings/approval-settings-form.tsx`
- Modify: `vizportal/src/app/(portal)/settings/approval/page.tsx`

Replace the current approval settings form with a new version that shows 3 sections (manual_clock, leave_request, overtime), each with an enable/disable toggle and an editable list of approval steps with role dropdown.

Steps use role options: `team_leader`, `dept_manager`, `business_manager`, `director`, and `reliever` (only for leave_request type).

Each step has an optional checkbox. Add/remove step buttons. Saves as JSON via hidden field.

- [ ] **Step 1: Rewrite approval settings form + page**

*Complete rewrite of the form component and page to fetch approval configs and render the chain editor.*

- [ ] **Step 2: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/settings/approval-settings-form.tsx src/app/\(portal\)/settings/approval/page.tsx
git commit -m "feat: add configurable approval chain editor — per-type enable/disable + custom steps"
```

---

## Task 9: Overtime Server Actions + Validations

**Files:**
- Create: `vizportal/src/lib/validations/overtime.ts`
- Create: `vizportal/src/lib/actions/overtime.ts`

- [ ] **Step 1: Create overtime validation schema**

Create `vizportal/src/lib/validations/overtime.ts`:

```typescript
import { z } from "zod";

export const overtimeRequestSchema = z.object({
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  reason: z.string().min(1, "Reason is required"),
});

export type OvertimeRequestInput = z.infer<typeof overtimeRequestSchema>;
```

- [ ] **Step 2: Create overtime server actions**

Create `vizportal/src/lib/actions/overtime.ts` with:
- `fileOvertimeRequest(_prevState, formData)` — validate, calculate hours (end - start), create record + approval request
- `getMyOvertimeRequests()` — list own requests
- `cancelOvertimeRequest(id)` — cancel pending request
- `getOvertimeRecords(filters)` — scoped records query (same pattern as attendance/leave)

*Complete code following the exact pattern from leave.ts — use createApprovalRequest with type 'overtime'.*

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/lib/validations/overtime.ts src/lib/actions/overtime.ts
git commit -m "feat: add overtime server actions — file, cancel, query with approval"
```

---

## Task 10: Overtime UI Components

**Files:**
- Create: `vizportal/src/components/overtime/overtime-request-form.tsx`
- Create: `vizportal/src/components/overtime/overtime-requests-table.tsx`
- Create: `vizportal/src/components/overtime/overtime-records.tsx`

- [ ] **Step 1: Create overtime request form**

Dialog form with: date, start time, end time (auto-calculates hours), reason (required), attachment (optional file upload). Uses `useActionState` with `fileOvertimeRequest`.

- [ ] **Step 2: Create overtime requests table**

Table showing: date, start time, end time, hours, status badge, reason, cancel button for pending. Same pattern as `leave-requests-table.tsx`.

- [ ] **Step 3: Create overtime records**

Tabbed records component (My Records, Team, Department, All Members) with `RecordsFilterBar` + export — same pattern as `attendance-records.tsx` and `leave-records.tsx`.

- [ ] **Step 4: Verify build + commit**

```bash
npm run build
git add src/components/overtime/
git commit -m "feat: add overtime UI — request form, table, records tabs"
```

---

## Task 11: Overtime Page

**Files:**
- Create: `vizportal/src/app/(portal)/overtime/page.tsx`

- [ ] **Step 1: Create overtime page**

Server page that fetches user roles, departments, overtime requests. Renders `OvertimeRequestForm`, `OvertimeRequestsTable`, separator, `OvertimeRecords`.

- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/app/\(portal\)/overtime/
git commit -m "feat: add overtime page — file requests, records tabs"
```

---

## Task 12: Leave Reliever Input Component

**Files:**
- Create: `vizportal/src/components/leave/reliever-input.tsx`

- [ ] **Step 1: Create reliever input component**

Autocomplete user search field + tasks textarea. Props: `index`, `onRemove`, `users` (for search). The component:
- Text input with debounced search that filters `users` prop by name
- Shows dropdown suggestions (top 5 matches)
- On select, stores the `reliever_id` in a hidden field
- Tasks textarea (required)
- Remove button

```typescript
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type User = { id: string; first_name: string | null; last_name: string | null };

type RelieverInputProps = {
  index: number;
  users: User[];
  onRemove: () => void;
  canRemove: boolean;
};

export function RelieverInput({ index, users, onRemove, canRemove }: RelieverInputProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = search.length > 0
    ? users.filter((u) =>
        formatFullName(u.first_name, u.last_name).toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : [];

  function handleSelect(user: User) {
    setSelectedId(user.id);
    setSelectedName(formatFullName(user.first_name, user.last_name));
    setSearch(formatFullName(user.first_name, user.last_name));
    setShowSuggestions(false);
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Reliever {index + 1}</Label>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input type="hidden" name={`reliever_id_${index}`} value={selectedId} />
      <div className="relative">
        <Input
          placeholder="Search employee..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowSuggestions(true);
            if (!e.target.value) { setSelectedId(""); setSelectedName(""); }
          }}
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => handleSelect(u)}
              >
                {formatFullName(u.first_name, u.last_name)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tasks to hand over</Label>
        <Textarea name={`reliever_tasks_${index}`} placeholder="List tasks for this reliever..." rows={2} required />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/components/leave/reliever-input.tsx
git commit -m "feat: add reliever input component — user autocomplete + tasks"
```

---

## Task 13: Update Leave Request Form — Relievers + Attachment

**Files:**
- Modify: `vizportal/src/components/leave/leave-request-form.tsx`
- Modify: `vizportal/src/lib/actions/leave.ts`

- [ ] **Step 1: Update leave request form**

Add to the form:
1. When selected leave type has `requires_reliever = true`, show reliever section
2. Reliever section: 1-3 `RelieverInput` components + "Add Reliever" button (max 3)
3. Optional file attachment upload field
4. Pass `users` prop (active profiles list) for reliever autocomplete

The form needs a new prop `users: { id: string; first_name: string | null; last_name: string | null }[]`.

- [ ] **Step 2: Update fileLeaveRequest action**

In `src/lib/actions/leave.ts`, update `fileLeaveRequest` to:
1. Handle file upload from formData (optional attachment)
2. After creating `leave_requests`, create `leave_request_relievers` records from `reliever_id_0`, `reliever_tasks_0`, etc.
3. Pass relievers to `createApprovalRequest` if present

- [ ] **Step 3: Update leave page to pass users**

In `src/app/(portal)/leave/page.tsx`, fetch active profiles and pass to `LeaveRequestForm`.

- [ ] **Step 4: Verify build + commit**

```bash
npm run build
git add src/components/leave/leave-request-form.tsx src/lib/actions/leave.ts src/app/\(portal\)/leave/page.tsx
git commit -m "feat: add relievers and attachment to leave request form"
```

---

## Task 14: Update Leave Type Table — Requires Reliever Toggle

**Files:**
- Modify: `vizportal/src/components/leave/leave-type-table.tsx`
- Modify: `vizportal/src/lib/validations/leave.ts`

- [ ] **Step 1: Add requires_reliever to leave type schema**

In `src/lib/validations/leave.ts`, add to `leaveTypeSchema`:
```typescript
  requires_reliever: z.boolean().default(false),
```

- [ ] **Step 2: Add toggle column to leave type table**

In `leave-type-table.tsx`, add a "Reliever" column showing a toggleable badge (like the active status toggle). Add `requires_reliever` checkbox to the create/edit form.

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/components/leave/leave-type-table.tsx src/lib/validations/leave.ts
git commit -m "feat: add requires_reliever toggle to leave type settings"
```

---

## Task 15: Update Manual Clock Dialog — Attachment Upload

**Files:**
- Modify: `vizportal/src/components/attendance/manual-clock-dialog.tsx`
- Modify: `vizportal/src/lib/actions/attendance.ts`

- [ ] **Step 1: Add file upload to manual clock dialog**

Add optional file input to the dialog form. On submit, upload to Supabase Storage at `{company_id}/attendance/{profile_id}/manual/{uuid}.{ext}`, then pass the URL as `attachment_url` in the form data.

- [ ] **Step 2: Update submitManualClock action**

Handle `attachment_url` from formData, include in `clock_entries` insert.

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/components/attendance/manual-clock-dialog.tsx src/lib/actions/attendance.ts
git commit -m "feat: add optional attachment upload to manual clock request"
```

---

## Task 16: Final Lint + Tests + Build

- [ ] **Step 1: Run full verification**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npm test && npm run build && npm run lint
```

Fix any issues.

- [ ] **Step 2: Push migrations**

```bash
npx supabase db push
npx supabase db query --linked "SELECT seed_company_approval_configs('a0000000-0000-4000-8000-000000000001');"
```

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod --yes
```
