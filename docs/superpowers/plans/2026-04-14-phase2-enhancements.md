# Phase 2 Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-employee leave balance allocation on the employee detail page, and an in-app system configuration page for Resend API key, cron secret, app URL, and email sender settings.

**Architecture:** New `system_settings` key-value table with DB-first, env-fallback resolution. New `getSystemSetting()` utility replaces hardcoded env reads across email, approval, and cron modules. Employee detail page gets a new "Leave" tab with allocate/adjust actions.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth), Tailwind + shadcn/ui, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-04-14-phase2-enhancements-design.md`

---

## File Structure

```
vizportal/
├── supabase/migrations/
│   └── 00025_create_system_settings.sql           # NEW
├── src/
│   ├── app/(portal)/
│   │   ├── employees/[id]/page.tsx                # MODIFY — add Leave tab
│   │   └── settings/system/page.tsx               # NEW
│   ├── components/
│   │   ├── leave/
│   │   │   └── employee-leave-tab.tsx             # NEW
│   │   └── settings/
│   │       └── system-config-form.tsx             # NEW
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── leave.ts                           # MODIFY — add 3 actions
│   │   │   └── system-settings.ts                 # NEW
│   │   └── utils/
│   │       ├── email.ts                           # MODIFY — use getSystemSetting
│   │       └── settings.ts                        # NEW
│   ├── types/
│   │   ├── database.ts                            # MODIFY — add system_settings
│   │   └── index.ts                               # MODIFY — add SystemSetting type
│   └── lib/
│       └── constants.ts                           # MODIFY — add route
├── src/
│   ├── components/layout/
│   │   └── header.tsx                             # MODIFY — add page title
│   └── app/api/cron/
│       ├── approval-reminders/route.ts            # MODIFY — use getSystemSetting
│       ├── mark-absences/route.ts                 # MODIFY — use getSystemSetting
│       └── leave-reset/route.ts                   # MODIFY — use getSystemSetting
└── src/app/api/email/send/route.ts                # MODIFY — use getSystemSetting
```

---

## Task 1: Database Migration + Types for system_settings

**Files:**
- Create: `vizportal/supabase/migrations/00025_create_system_settings.sql`
- Modify: `vizportal/src/types/database.ts`
- Modify: `vizportal/src/types/index.ts`

- [ ] **Step 1: Create migration 00025**

Create `vizportal/supabase/migrations/00025_create_system_settings.sql`:

```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, key)
);

CREATE INDEX idx_system_settings_company_id ON system_settings(company_id);

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view system settings"
  ON system_settings FOR SELECT
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can manage system settings"
  ON system_settings FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));
```

- [ ] **Step 2: Add system_settings type to database.ts**

Add inside `Database["public"]["Tables"]` after `approval_steps` closing `};`:

```typescript
      system_settings: {
        Row: {
          id: string;
          company_id: string;
          key: string;
          value: string;
          is_secret: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          key: string;
          value: string;
          is_secret?: boolean;
        };
        Update: {
          value?: string;
          is_secret?: boolean;
        };
        Relationships: [];
      };
```

- [ ] **Step 3: Add type alias to index.ts**

Add after the existing `ApprovalStep` alias:

```typescript
export type SystemSetting = Database["public"]["Tables"]["system_settings"]["Row"];
```

- [ ] **Step 4: Add route to constants.ts**

Add to `ROUTE_ROLE_MAP`:

```typescript
  "/settings/system": ["admin"],
```

Add page title to `src/components/layout/header.tsx` in the `getPageTitle` map:

```typescript
    "/settings/system": "System Configuration",
```

- [ ] **Step 5: Push migration to remote**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npx supabase db push
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/00025_create_system_settings.sql src/types/ src/lib/constants.ts src/components/layout/header.tsx
git commit -m "feat: add system_settings table, types, and route"
```

---

## Task 2: Settings Utility (getSystemSetting)

**Files:**
- Create: `vizportal/src/lib/utils/settings.ts`

- [ ] **Step 1: Create settings utility**

Create `vizportal/src/lib/utils/settings.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const DEFAULTS: Record<string, string> = {
  app_url: "https://vizportal.vercel.app",
  email_sender_address: "noreply@vizserve.com",
  email_sender_name: "VizPortal",
};

const ENV_MAP: Record<string, string> = {
  resend_api_key: "RESEND_API_KEY",
  cron_secret: "CRON_SECRET",
  app_url: "NEXT_PUBLIC_APP_URL",
};

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get a system setting value.
 * Resolution order: DB → env var → hardcoded default → null
 */
export async function getSystemSetting(
  key: string,
  companyId?: string
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("system_settings")
      .select("value")
      .eq("key", key);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data } = await query.limit(1).single();

    if (data?.value) return data.value;
  } catch {
    // DB lookup failed — fall through to env/default
  }

  // Env var fallback
  const envKey = ENV_MAP[key];
  if (envKey && process.env[envKey]) {
    return process.env[envKey]!;
  }

  // Hardcoded default
  return DEFAULTS[key] ?? null;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/settings.ts
git commit -m "feat: add getSystemSetting utility — DB-first with env/default fallback"
```

---

## Task 3: System Settings Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/system-settings.ts`

- [ ] **Step 1: Create server actions**

Create `vizportal/src/lib/actions/system-settings.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SETTING_KEYS = [
  { key: "resend_api_key", label: "Resend API Key", isSecret: true },
  { key: "cron_secret", label: "Cron Secret", isSecret: true },
  { key: "app_url", label: "Application URL", isSecret: false },
  { key: "email_sender_address", label: "Sender Email Address", isSecret: false },
  { key: "email_sender_name", label: "Sender Display Name", isSecret: false },
];

export { SETTING_KEYS };

/**
 * Get all system settings for the current user's company.
 */
export async function getSystemSettings() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("system_settings")
    .select("*")
    .order("key");

  return data ?? [];
}

/**
 * Update system settings (upsert multiple key-value pairs).
 */
export async function updateSystemSettings(
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

  for (const setting of SETTING_KEYS) {
    const value = formData.get(setting.key) as string;
    if (value === null || value === undefined) continue;

    // Skip empty secret fields (means "keep existing")
    if (setting.isSecret && value === "") continue;

    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("key", setting.key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, is_secret: setting.isSecret })
        .eq("id", existing.id);

      if (error) return { error: `Failed to update ${setting.label}` };
    } else {
      if (value === "") continue; // Don't insert empty values

      const { error } = await supabase
        .from("system_settings")
        .insert({
          company_id: profile.company_id,
          key: setting.key,
          value,
          is_secret: setting.isSecret,
        });

      if (error) return { error: `Failed to save ${setting.label}` };
    }
  }

  revalidatePath("/settings/system");
  return { success: true };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/system-settings.ts
git commit -m "feat: add system settings server actions — get and upsert"
```

---

## Task 4: System Config UI + Page

**Files:**
- Create: `vizportal/src/components/settings/system-config-form.tsx`
- Create: `vizportal/src/app/(portal)/settings/system/page.tsx`

- [ ] **Step 1: Create system config form component**

Create `vizportal/src/components/settings/system-config-form.tsx`:

```typescript
"use client";

import { useActionState, useEffect, useState } from "react";
import { updateSystemSettings, SETTING_KEYS } from "@/lib/actions/system-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Shield } from "lucide-react";
import type { SystemSetting } from "@/types";

type SystemConfigFormProps = {
  settings: SystemSetting[];
};

export function SystemConfigForm({ settings }: SystemConfigFormProps) {
  const [state, formAction, isPending] = useActionState(updateSystemSettings, null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (state && "success" in state) toast.success("Settings saved");
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  function getValue(key: string): string {
    const setting = settings.find((s) => s.key === key);
    return setting?.value ?? "";
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const emailSettings = SETTING_KEYS.filter(
    (s) => s.key === "resend_api_key" || s.key === "email_sender_address" || s.key === "email_sender_name"
  );
  const securitySettings = SETTING_KEYS.filter(
    (s) => s.key === "cron_secret" || s.key === "app_url"
  );

  function renderField(setting: (typeof SETTING_KEYS)[number]) {
    const currentValue = getValue(setting.key);
    const isRevealed = revealed[setting.key] ?? false;

    return (
      <div key={setting.key} className="space-y-2">
        <Label htmlFor={setting.key}>{setting.label}</Label>
        <div className="flex gap-2">
          <Input
            id={setting.key}
            name={setting.key}
            type={setting.isSecret && !isRevealed ? "password" : "text"}
            defaultValue={currentValue}
            placeholder={setting.isSecret ? (currentValue ? "••••••••" : "Not set") : "Not set"}
          />
          {setting.isSecret && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => toggleReveal(setting.key)}
            >
              {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {setting.isSecret && (
          <p className="text-xs text-muted-foreground">
            Leave empty to keep the current value.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle className="text-base">Email Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the email service used for approval notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailSettings.map(renderField)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <CardDescription>
            Cron job authentication and application URL for email links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {securitySettings.map(renderField)}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create system settings page**

Create `vizportal/src/app/(portal)/settings/system/page.tsx`:

```typescript
import { getSystemSettings } from "@/lib/actions/system-settings";
import { SystemConfigForm } from "@/components/settings/system-config-form";

export default async function SystemSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">System Configuration</h1>
      <SystemConfigForm settings={settings} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/system-config-form.tsx src/app/\(portal\)/settings/system/
git commit -m "feat: add system config page — email, cron secret, app URL settings"
```

---

## Task 5: Integrate getSystemSetting into Email + Cron + Approvals

**Files:**
- Modify: `vizportal/src/lib/utils/email.ts`
- Modify: `vizportal/src/lib/actions/approvals.ts`
- Modify: `vizportal/src/app/api/cron/approval-reminders/route.ts`
- Modify: `vizportal/src/app/api/cron/mark-absences/route.ts`
- Modify: `vizportal/src/app/api/cron/leave-reset/route.ts`
- Modify: `vizportal/src/app/api/email/send/route.ts`

- [ ] **Step 1: Update email.ts to use getSystemSetting**

Replace the `sendEmail` function in `src/lib/utils/email.ts`:

```typescript
import { Resend } from "resend";
import { getSystemSetting } from "@/lib/utils/settings";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = await getSystemSetting("resend_api_key");

  if (!apiKey) {
    console.warn("Resend API key not configured — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  const senderName = (await getSystemSetting("email_sender_name")) ?? "VizPortal";
  const senderAddress = (await getSystemSetting("email_sender_address")) ?? "noreply@vizserve.com";

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: `${senderName} <${senderAddress}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Email send exception:", err);
    return { success: false, error: "Failed to send email" };
  }
}
```

Keep all `buildApprovalEmail`, `buildStatusEmail`, `buildReminderEmail` functions unchanged.

- [ ] **Step 2: Update approvals.ts to use getSystemSetting for app_url**

In `src/lib/actions/approvals.ts`, find the two lines that build `approvalUrl` and replace:

```typescript
// Before:
const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://vizportal.vercel.app"}/approvals/${firstStep.token}`;

// After:
const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
const approvalUrl = `${appUrl}/approvals/${firstStep.token}`;
```

Apply this to both occurrences (in `createApprovalRequest` and in `processApprovalDecision`). Add import at top:

```typescript
import { getSystemSetting } from "@/lib/utils/settings";
```

- [ ] **Step 3: Update cron routes to use getSystemSetting for auth**

For each of the 3 cron routes and the email/send route, replace the auth check:

```typescript
// Before:
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// After:
const authHeader = request.headers.get("authorization");
const cronSecret = await getSystemSetting("cron_secret");
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Add import to each file:

```typescript
import { getSystemSetting } from "@/lib/utils/settings";
```

Also update the `approvalUrl` in `approval-reminders/route.ts`:

```typescript
// Before:
const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://vizportal.vercel.app"}/approvals/${step.token}`;

// After:
const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
const approvalUrl = `${appUrl}/approvals/${step.token}`;
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/email.ts src/lib/actions/approvals.ts src/app/api/
git commit -m "feat: integrate getSystemSetting into email, approvals, and cron routes"
```

---

## Task 6: Leave Balance Allocation Actions

**Files:**
- Modify: `vizportal/src/lib/actions/leave.ts`

- [ ] **Step 1: Add three new actions to leave.ts**

Append to `src/lib/actions/leave.ts`:

```typescript
/**
 * Get an employee's leave balances with leave type info.
 * Returns all active leave types with optional balance for current year.
 */
export async function getEmployeeLeaveBalances(profileId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get employee's company
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", profileId)
    .single();

  if (!profile) return [];

  const year = new Date().getFullYear();

  // Get all active leave types for the company
  const { data: leaveTypes } = await supabase
    .from("leave_types")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("name");

  // Get existing balances for this employee + year
  const { data: balances } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("profile_id", profileId)
    .eq("year", year);

  // Merge: each leave type with its balance (or null)
  return (leaveTypes ?? []).map((lt) => {
    const balance = (balances ?? []).find((b) => b.leave_type_id === lt.id);
    return {
      leaveType: lt,
      balance: balance ?? null,
    };
  });
}

/**
 * Allocate a leave balance for an employee for a specific leave type.
 * Prorates based on months remaining until the company's reset date.
 */
export async function allocateLeaveBalance(
  profileId: string,
  leaveTypeId: string
) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Employee not found" };

  const year = new Date().getFullYear();

  // Check if already allocated
  const { data: existing } = await supabase
    .from("leave_balances")
    .select("id")
    .eq("profile_id", profileId)
    .eq("leave_type_id", leaveTypeId)
    .eq("year", year)
    .single();

  if (existing) return { error: "Balance already allocated for this year" };

  // Get leave type
  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("default_days")
    .eq("id", leaveTypeId)
    .single();

  if (!leaveType) return { error: "Leave type not found" };

  // Get reset date for proration
  const { data: settings } = await supabase
    .from("leave_settings")
    .select("reset_month, reset_day")
    .eq("company_id", profile.company_id)
    .single();

  const resetMonth = settings?.reset_month ?? 1;
  const resetDay = settings?.reset_day ?? 1;

  // Calculate months remaining until next reset
  const now = new Date();
  let nextReset = new Date(year, resetMonth - 1, resetDay);
  if (nextReset <= now) {
    nextReset = new Date(year + 1, resetMonth - 1, resetDay);
  }

  const monthsRemaining = Math.max(
    0,
    (nextReset.getFullYear() - now.getFullYear()) * 12 +
      (nextReset.getMonth() - now.getMonth())
  );

  // Prorate: round to nearest 0.5
  const prorated = Math.round((leaveType.default_days * monthsRemaining / 12) * 2) / 2;

  const { error } = await supabase.from("leave_balances").insert({
    profile_id: profileId,
    company_id: profile.company_id,
    leave_type_id: leaveTypeId,
    year,
    total_days: prorated,
    used_days: 0,
    remaining_days: prorated,
    carried_over_days: 0,
  });

  if (error) return { error: "Failed to allocate balance" };

  revalidatePath(`/employees/${profileId}`);
  return { success: true };
}

/**
 * Allocate balances for all unallocated leave types for an employee.
 */
export async function allocateAllLeaveBalances(profileId: string) {
  const balanceData = await getEmployeeLeaveBalances(profileId);

  let allocated = 0;
  for (const item of balanceData) {
    if (!item.balance) {
      const result = await allocateLeaveBalance(profileId, item.leaveType.id);
      if ("success" in result) allocated++;
    }
  }

  revalidatePath(`/employees/${profileId}`);
  return { success: true, allocated };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/leave.ts
git commit -m "feat: add leave balance allocation actions — single, bulk, with proration"
```

---

## Task 7: Employee Leave Tab Component

**Files:**
- Create: `vizportal/src/components/leave/employee-leave-tab.tsx`

- [ ] **Step 1: Create employee leave tab component**

Create `vizportal/src/components/leave/employee-leave-tab.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  allocateLeaveBalance,
  allocateAllLeaveBalances,
} from "@/lib/actions/leave";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { BalanceAdjustmentDialog } from "@/components/leave/balance-adjustment-dialog";
import type { LeaveType, LeaveBalance } from "@/types";

type BalanceRow = {
  leaveType: LeaveType;
  balance: LeaveBalance | null;
};

type EmployeeLeaveTabProps = {
  profileId: string;
  balances: BalanceRow[];
};

export function EmployeeLeaveTab({ profileId, balances }: EmployeeLeaveTabProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [adjustBalance, setAdjustBalance] = useState<{
    id: string;
    total_days: number;
    used_days: number;
    remaining_days: number;
    employeeName: string;
    leaveTypeName: string;
  } | null>(null);

  const hasUnallocated = balances.some((b) => !b.balance);

  async function handleAllocate(leaveTypeId: string) {
    setLoading(leaveTypeId);
    const result = await allocateLeaveBalance(profileId, leaveTypeId);
    if ("error" in result) toast.error(result.error);
    else toast.success("Balance allocated");
    setLoading(null);
  }

  async function handleAllocateAll() {
    setBulkLoading(true);
    const result = await allocateAllLeaveBalances(profileId);
    if ("error" in result) toast.error(result.error);
    else toast.success(`${result.allocated} balance(s) allocated`);
    setBulkLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Leave Balances ({new Date().getFullYear()})
          </CardTitle>
          {hasUnallocated && (
            <Button
              size="sm"
              onClick={handleAllocateAll}
              disabled={bulkLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              {bulkLoading ? "Allocating..." : "Allocate All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Leave Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((row) => (
              <TableRow key={row.leaveType.id}>
                <TableCell>{row.leaveType.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.leaveType.code}</Badge>
                </TableCell>
                {row.balance ? (
                  <>
                    <TableCell className="text-right">
                      {row.balance.total_days}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.balance.used_days}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.balance.remaining_days}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setAdjustBalance({
                            id: row.balance!.id,
                            total_days: row.balance!.total_days,
                            used_days: row.balance!.used_days,
                            remaining_days: row.balance!.remaining_days,
                            employeeName: "",
                            leaveTypeName: row.leaveType.name,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Not allocated
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAllocate(row.leaveType.id)}
                        disabled={loading === row.leaveType.id}
                      >
                        {loading === row.leaveType.id ? "..." : "Allocate"}
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <BalanceAdjustmentDialog
        open={!!adjustBalance}
        onOpenChange={(open) => !open && setAdjustBalance(null)}
        balance={adjustBalance}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/leave/employee-leave-tab.tsx
git commit -m "feat: add employee leave tab component — allocate, adjust balances"
```

---

## Task 8: Add Leave Tab to Employee Detail Page

**Files:**
- Modify: `vizportal/src/app/(portal)/employees/[id]/page.tsx`

- [ ] **Step 1: Update employee detail page**

Add imports at top of `src/app/(portal)/employees/[id]/page.tsx`:

```typescript
import { EmployeeLeaveTab } from "@/components/leave/employee-leave-tab";
import { getEmployeeLeaveBalances } from "@/lib/actions/leave";
```

After the existing `Promise.all` for departments/jobLevels, add:

```typescript
  // Fetch leave balances (admin/HR only)
  const leaveBalances = isAdminOrHr
    ? await getEmployeeLeaveBalances(id)
    : [];
```

Add a new `TabsTrigger` and `TabsContent` inside the `Tabs` component, after the "documents" tab:

```typescript
          {isAdminOrHr && <TabsTrigger value="leave">Leave</TabsTrigger>}
```

```typescript
        {isAdminOrHr && (
          <TabsContent value="leave">
            <EmployeeLeaveTab
              profileId={id}
              balances={leaveBalances as any}
            />
          </TabsContent>
        )}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 4: Run tests**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(portal\)/employees/\[id\]/page.tsx
git commit -m "feat: add Leave tab to employee detail page — balance allocation for HR/Admin"
```

---

## Task 9: Final Build + Lint + Deploy

- [ ] **Step 1: Full verification**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
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
