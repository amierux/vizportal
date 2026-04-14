# VizPortal Phase 2 Enhancements — Design Spec

**Date:** 2026-04-14
**Project:** VizPortal — Multi-tenant internal portal for VizServe Inc.
**Scope:** Two additions to the existing Phase 2 deployment

---

## 1. Per-Employee Leave Balance Setup

### 1.1 Problem

Leave balances are only created by the annual reset cron (runs once per year on the configured reset date). There is no way to allocate initial balances for existing employees or mid-year hires until the next reset.

### 1.2 Solution

Add a "Leave" tab to the employee detail page (`/employees/[id]`). HR/Admin can view, allocate, and adjust leave balances per employee.

### 1.3 UI

**Location:** `/employees/[id]` — new tab alongside existing Employment and Personal Info tabs.

**Tab contents:**
- "Allocate All" button at the top — creates balance records for all unallocated leave types at once
- Table with one row per active leave type:

| Leave Type | Code | Total | Used | Remaining | Action |
|------------|------|-------|------|-----------|--------|
| Vacation Leave | VL | 5.0 | 0.0 | 5.0 | Adjust |
| Sick Leave | SL | — | — | Not allocated | Allocate |

- "Allocate" creates a prorated balance for that type
- "Adjust" opens the existing `BalanceAdjustmentDialog`
- Read-only for non-HR/Admin users (members see their own balances on `/leave`)

### 1.4 Proration Logic

When allocating mid-year:

```
prorated_days = default_days × (months_remaining_until_reset / 12)
```

Rounded to nearest 0.5. `months_remaining_until_reset` is calculated from today to the company's configured reset date (`leave_settings.reset_month`/`reset_day`).

### 1.5 Server Actions

**New in `src/lib/actions/leave.ts`:**

- `getEmployeeLeaveBalances(profileId: string)` — Returns all leave types for the company with the employee's current-year balance (or null if not allocated). Joins `leave_types` LEFT JOIN `leave_balances` filtered by profile + current year.

- `allocateLeaveBalance(profileId: string, leaveTypeId: string)` — Creates a new `leave_balances` record with prorated `total_days`. Returns `{ error }` or `{ success: true }`. Fails if balance already exists.

- `allocateAllLeaveBalances(profileId: string)` — Iterates all active leave types, allocates any that don't have a balance record for the current year. Returns `{ success: true, allocated: number }`.

### 1.6 Component

**New:** `src/components/leave/employee-leave-tab.tsx` — Client component receiving `balances` (leave types with optional balance data) and `profileId`. Renders the table, handles Allocate/Allocate All actions, opens `BalanceAdjustmentDialog` for Adjust.

### 1.7 Page Changes

**Modify:** `src/app/(portal)/employees/[id]/page.tsx` — Add "Leave" tab that fetches `getEmployeeLeaveBalances(id)` and renders `EmployeeLeaveTab`. Only visible to HR/Admin roles.

---

## 2. System Config Page

### 2.1 Problem

System settings like the Resend API key, cron secret, app URL, and email sender details are stored as environment variables. Admin cannot view or change them without access to Vercel or the server.

### 2.2 Solution

Add a `system_settings` database table and a `/settings/system` admin page. Settings stored in the database override environment variable defaults, giving admin control from within the app.

### 2.3 Database Schema

**New table: `system_settings`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| key | TEXT | NOT NULL | Setting identifier |
| value | TEXT | NOT NULL | Setting value |
| is_secret | BOOLEAN | DEFAULT false, NOT NULL | Mask in UI |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| UNIQUE(company_id, key) | | | |

**Trigger:** `updated_at` auto-update (reuse existing `update_updated_at()`)

**RLS:**
- SELECT: admin only (`company_id = get_user_company_id() AND has_role('admin')`)
- ALL: admin only (same)

**Indexes:** `company_id`, UNIQUE(`company_id`, `key`)

### 2.4 Settings Keys

| Key | Label | Secret | Default (env fallback) |
|-----|-------|--------|----------------------|
| `resend_api_key` | Resend API Key | Yes | `process.env.RESEND_API_KEY` |
| `cron_secret` | Cron Secret | Yes | `process.env.CRON_SECRET` |
| `app_url` | Application URL | No | `process.env.NEXT_PUBLIC_APP_URL` or `https://vizportal.vercel.app` |
| `email_sender_address` | Sender Email Address | No | `noreply@vizserve.com` |
| `email_sender_name` | Sender Display Name | No | `VizPortal` |

### 2.5 Settings Utility

**New:** `src/lib/utils/settings.ts`

```typescript
export async function getSystemSetting(key: string, companyId?: string): Promise<string | null>
```

- Queries `system_settings` for the key + company
- If found, returns the value
- If not found, falls back to env var or hardcoded default
- Uses a service-role client (bypasses RLS) since this is called from server actions and cron routes that may not have a user session

**Fallback chain:** DB value → env var → hardcoded default → null

### 2.6 Integration Points

Update these files to use `getSystemSetting()` instead of direct env/hardcoded values:

1. **`src/lib/utils/email.ts`** — Read `resend_api_key`, `email_sender_address`, `email_sender_name`
2. **`src/lib/actions/approvals.ts`** — Read `app_url` for approval email links
3. **`src/app/api/cron/approval-reminders/route.ts`** — Read `cron_secret` for auth, `app_url` for links
4. **`src/app/api/cron/mark-absences/route.ts`** — Read `cron_secret` for auth
5. **`src/app/api/cron/leave-reset/route.ts`** — Read `cron_secret` for auth
6. **`src/app/api/email/send/route.ts`** — Read `cron_secret` for auth

### 2.7 Server Actions

**New:** `src/lib/actions/system-settings.ts`

- `getSystemSettings()` — Returns all settings for the current user's company
- `updateSystemSettings(_prevState, formData)` — Upserts multiple key-value pairs from the form. Form action pattern with `_prevState`.

### 2.8 UI

**Route:** `/settings/system` (admin only)

**Component:** `src/components/settings/system-config-form.tsx`

Card-based form with two sections:

**Email Configuration:**
- Resend API Key (password input, masked by default, "Reveal" toggle)
- Sender Display Name (text input)
- Sender Email Address (text input)

**Security:**
- Cron Secret (password input, masked by default, "Reveal" toggle)
- Application URL (text input)

Single "Save Settings" button. Toast on success/error. Uses `useActionState` pattern.

### 2.9 Route Map

Add to `ROUTE_ROLE_MAP`:
```typescript
"/settings/system": ["admin"],
```

### 2.10 Navigation

Add "System" link to the Settings sub-navigation (sidebar items under Settings, and mobile menu in header).

### 2.11 Page Title

Add to header `getPageTitle()`:
```typescript
"/settings/system": "System Configuration",
```

---

## 3. File Structure (New/Modified)

```
vizportal/
├── supabase/migrations/
│   └── 00025_create_system_settings.sql          # NEW
├── src/
│   ├── app/(portal)/
│   │   ├── employees/[id]/page.tsx               # MODIFY — add Leave tab
│   │   └── settings/system/page.tsx              # NEW
│   ├── components/
│   │   ├── leave/
│   │   │   └── employee-leave-tab.tsx            # NEW
│   │   └── settings/
│   │       └── system-config-form.tsx            # NEW
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── leave.ts                          # MODIFY — add 3 actions
│   │   │   └── system-settings.ts                # NEW
│   │   └── utils/
│   │       ├── email.ts                          # MODIFY — use getSystemSetting
│   │       └── settings.ts                       # NEW
│   ├── types/
│   │   ├── database.ts                           # MODIFY — add system_settings
│   │   └── index.ts                              # MODIFY — add SystemSetting type
│   └── lib/constants.ts                          # MODIFY — add route
├── src/app/api/cron/
│   ├── approval-reminders/route.ts               # MODIFY — use getSystemSetting
│   ├── mark-absences/route.ts                    # MODIFY — use getSystemSetting
│   └── leave-reset/route.ts                      # MODIFY — use getSystemSetting
└── src/app/api/email/send/route.ts               # MODIFY — use getSystemSetting
```
