# VizPortal Phase 2B Enhancements — Design Spec

**Date:** 2026-04-14
**Project:** VizPortal — Multi-tenant internal portal for VizServe Inc.
**Scope:** Attendance non-working days, company timezone, overtime module, configurable approval chains, leave relievers, attachment uploads

---

## 1. Company Timezone Setting

### 1.1 Database

Add column to `companies`:
```sql
ALTER TABLE companies ADD COLUMN timezone TEXT DEFAULT 'Asia/Singapore' NOT NULL;
```

### 1.2 UI

Add timezone dropdown to `/settings/company` (CompanyForm). Dropdown with common timezones (Asia/Singapore, Asia/Manila, Asia/Tokyo, UTC, etc.).

### 1.3 Impact

Replace all hardcoded `SGT_TIMEZONE` / `"Asia/Singapore"` references across the codebase with a dynamic read from the company's timezone field. Affected files:
- `src/lib/utils/attendance.ts` — all SGT functions
- `src/lib/constants.ts` — remove `SGT_TIMEZONE` constant
- `src/components/attendance/live-clock.tsx`
- `src/components/attendance/clock-button.tsx`
- `src/lib/actions/attendance.ts`
- `src/app/api/cron/mark-absences/route.ts`
- `src/app/api/cron/leave-reset/route.ts`

A new utility `getCompanyTimezone(companyId?)` will fetch the timezone from the companies table, with `"Asia/Singapore"` as fallback.

---

## 2. Non-Working Days (Attendance Settings)

### 2.1 Database

**New column on `companies`:**
```sql
ALTER TABLE companies ADD COLUMN holiday_country TEXT DEFAULT 'PH' NOT NULL;
```

**New table: `non_working_days`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| name | TEXT | NOT NULL | e.g., "Christmas Day" |
| date | DATE | NOT NULL | Specific date |
| is_recurring | BOOLEAN | DEFAULT false, NOT NULL | If true, repeats annually (month+day only) |
| country | TEXT | DEFAULT 'PH', NOT NULL | Country code for categorization |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** company_id, (company_id, date)
**RLS:** Admin can manage; all authenticated can read (for calendar display).

### 2.2 Settings UI

New settings tab: `/settings/attendance` (admin only).

Contents:
- Holiday country dropdown (PH, SG, US, etc.) — stored on company
- Table of non-working days: name, date, recurring toggle, country tag
- Add/edit/delete buttons
- Bulk add: option to seed PH statutory holidays for the year

### 2.3 Logic Changes

- `mark-absences` cron: skip employees whose scheduled date falls on a non-working day
- `recalculateDailySummary`: check non-working days before calculating
- Attendance calendar: show non-working days as a distinct color (e.g., purple)
- Leave `countWorkDays`: exclude non-working days from leave day calculation

### 2.4 Route

Add `/settings/attendance` to ROUTE_ROLE_MAP (admin only) and settings nav.

---

## 3. Overtime Module

### 3.1 Database

**New table: `overtime_requests`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| profile_id | UUID | FK profiles(id), NOT NULL | Requester |
| date | DATE | NOT NULL | OT date |
| start_time | TIME | NOT NULL | OT start |
| end_time | TIME | NOT NULL | OT end |
| total_hours | DECIMAL(5,2) | NOT NULL | Calculated: end - start |
| reason | TEXT | NOT NULL | |
| attachment_url | TEXT | | Optional |
| status | TEXT | CHECK ('pending','approved','rejected','cancelled'), DEFAULT 'pending', NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** company_id, profile_id, (profile_id, date)
**Trigger:** updated_at auto-update
**RLS:** Same pattern as leave_requests — admin/HR see all, TL/DM see dept, member sees own.

### 3.2 Routes

| Route | Roles | Description |
|-------|-------|-------------|
| `/overtime` | all | My Overtime — file request, view my requests, records tabs |

Records tabs follow the same pattern as attendance/leave:
- My Records (all users)
- Team Records (team_leader)
- Department Records (dept_manager)
- All Members (admin, hr, business_manager, director)
- Each with date range, name search, department filter, export CSV/PDF

### 3.3 Filing Form

Fields: date, start time, end time (system calculates total_hours = end - start), reason (required), attachment (optional file upload).

Submits → creates `overtime_requests` + triggers approval chain via `createApprovalRequest` with type `'overtime'`.

### 3.4 Navigation

Add "Overtime" to sidebar between Leave and Approvals. Add to bottom tabs for mobile. Add route to ROUTE_ROLE_MAP.

### 3.5 Server Actions

New file: `src/lib/actions/overtime.ts`
- `fileOvertimeRequest(_prevState, formData)` — validate, calculate hours, create record + approval
- `getMyOvertimeRequests()` — list own requests
- `cancelOvertimeRequest(id)` — cancel pending request
- `getOvertimeRecords(filters)` — scoped records query (same pattern as attendance/leave records)

### 3.6 Components

- `src/components/overtime/overtime-request-form.tsx` — file OT dialog
- `src/components/overtime/overtime-requests-table.tsx` — requests list with status badges
- `src/components/overtime/overtime-records.tsx` — records tabs with filters + export

### 3.7 Approval Side Effects

On final approval: update `overtime_requests.status = 'approved'`.
On rejection: update `overtime_requests.status = 'rejected'`.
On cancellation: update status to `'cancelled'`, cancel approval chain.

---

## 4. Configurable Approval Chains

### 4.1 Database

**New table: `approval_configs`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| type | TEXT | NOT NULL | 'manual_clock', 'leave_request', 'overtime' |
| is_enabled | BOOLEAN | DEFAULT true, NOT NULL | If false, auto-approve |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| UNIQUE(company_id, type) | | | |

**Trigger:** updated_at auto-update

**New table: `approval_config_steps`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| approval_config_id | UUID | FK approval_configs(id) ON DELETE CASCADE, NOT NULL | |
| step_order | INTEGER | NOT NULL | 1, 2, 3... |
| role | TEXT | NOT NULL | 'reliever', 'team_leader', 'dept_manager', 'business_manager', 'director' |
| is_optional | BOOLEAN | DEFAULT false, NOT NULL | Skip if no user holds this role |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**RLS:** Admin only for both tables.

### 4.2 Default Configs (Seeded per Company)

| Type | Steps |
|------|-------|
| manual_clock | 1: team_leader, 2: dept_manager |
| leave_request | 1: reliever, 2: team_leader, 3: dept_manager |
| overtime | 1: team_leader, 2: dept_manager, 3: business_manager (optional), 4: director (optional) |

Seed function: `seed_company_approval_configs(p_company_id UUID)`

### 4.3 Approval Engine Changes

`createApprovalRequest` is refactored:

1. Read `approval_configs` for the given type + company
2. If `is_enabled = false` → auto-approve: apply side effects immediately, skip approval chain, return success
3. If enabled, read `approval_config_steps` ordered by `step_order`
4. For each step, resolve the actual approver(s):
   - `team_leader` → `departments.team_leader_id` from requester's department
   - `dept_manager` → `departments.manager_id` from requester's department
   - `business_manager` → `companies.business_manager_id`
   - `director` → `companies.director_id`
   - `reliever` → resolved from `leave_request_relievers` on the leave request (multiple approvers per step)
5. Skip steps where `is_optional = true` and no user holds the role
6. Skip steps where the resolved user is the requester
7. Create `approval_steps` for each resolved approver
8. For reliever steps: create one step per reliever, all with the same `step_order`. All must approve before advancing.

### 4.4 Approval Settings UI

Enhanced `/settings/approval` page with 3 sections:

**Manual Clock In/Out:**
- Enable/disable toggle
- Ordered list of approval steps (role dropdown per step)
- Add/remove step buttons

**Leave Approval:**
- Enable/disable toggle
- Ordered list (includes 'reliever' as a role option)
- Add/remove step buttons

**Overtime Approval:**
- Enable/disable toggle
- Ordered list with optional flag checkbox per step
- Add/remove step buttons

### 4.5 Server Actions

New file: `src/lib/actions/approval-configs.ts`
- `getApprovalConfigs()` — all configs + steps for the company
- `updateApprovalConfig(_prevState, formData)` — upsert config + steps for a type

---

## 5. Leave Reliever System

### 5.1 Database

**New column on `leave_types`:**
```sql
ALTER TABLE leave_types ADD COLUMN requires_reliever BOOLEAN DEFAULT false NOT NULL;
```

**New table: `leave_request_relievers`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| leave_request_id | UUID | FK leave_requests(id) ON DELETE CASCADE, NOT NULL | |
| reliever_id | UUID | FK profiles(id), NOT NULL | The reliever user |
| tasks | TEXT | NOT NULL | Tasks assigned to this reliever |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** leave_request_id, reliever_id
**RLS:** Requester can insert own. Reliever can read own. Admin/HR can read all.

### 5.2 Leave Type Settings

Add `requires_reliever` toggle to the leave type CRUD table in `/settings/employees`. When enabled for a type, the leave request form shows the reliever section.

### 5.3 Leave Request Form Changes

When the selected leave type has `requires_reliever = true`:
- Show reliever section (required, 1-3 relievers)
- Each reliever row: user autocomplete field (searches active profiles by name) + tasks textarea
- Add Reliever / Remove Reliever buttons (min 1, max 3)

User autocomplete: debounced search on input, queries profiles by `first_name || last_name`, returns top 5 matches, displayed as dropdown suggestions.

### 5.4 Filing Flow

1. Employee fills form including relievers
2. Submit → create `leave_requests` record
3. Create `leave_request_relievers` records (1-3)
4. Call `createApprovalRequest` → engine reads config, sees reliever step
5. Creates one `approval_steps` row per reliever (all with `step_order = 1`)
6. Emails sent to all relievers
7. All relievers must approve → then advances to step 2 (TL)
8. If any reliever rejects → entire request rejected

### 5.5 Reliever Notification Email

Subject: "[VizPortal] Reliever request: {requester} needs coverage for {leave_type}"
Body includes: requester name, leave dates, assigned tasks for this reliever, approve/reject link.

### 5.6 Components

- Update `leave-request-form.tsx` — add reliever section with autocomplete
- New `src/components/leave/reliever-input.tsx` — autocomplete user search + tasks field
- Update `leave-type-table.tsx` — add requires_reliever toggle column

---

## 6. Attachment Uploads

### 6.1 Manual Clock Request

Add column: `ALTER TABLE clock_entries ADD COLUMN attachment_url TEXT;`

Update `manual-clock-dialog.tsx`: add optional file upload field.
Update `submitManualClock` action: handle file upload to `{company_id}/attendance/{profile_id}/manual/{uuid}.{ext}`.

Update database types: add `attachment_url` to clock_entries Row/Insert/Update.

### 6.2 Leave Request

The `attachment_url` column already exists on `leave_requests`. Update the `leave-request-form.tsx` to expose it as an optional file upload field. Upload to `{company_id}/leave/{profile_id}/{uuid}.{ext}`.

---

## 7. New Routes Summary

| Route | Roles | Description |
|-------|-------|-------------|
| `/overtime` | all | My Overtime + records tabs |
| `/settings/attendance` | admin | Non-working days management |

Updated settings nav tabs: Company | Invitations | Departments | Job Levels | Roles | Employees | Attendance | Approval | System

---

## 8. New Dependencies

None — all features use existing packages (Supabase, shadcn/ui, Resend).

---

## 9. Migration List

| # | File | Description |
|---|------|-------------|
| 00028 | add_company_timezone.sql | Add timezone + holiday_country to companies |
| 00029 | create_non_working_days.sql | Non-working days table + RLS |
| 00030 | create_overtime_requests.sql | Overtime requests table + RLS |
| 00031 | create_approval_configs.sql | Approval configs + steps tables + RLS |
| 00032 | add_leave_reliever.sql | requires_reliever on leave_types + leave_request_relievers table + RLS |
| 00033 | add_clock_entry_attachment.sql | attachment_url on clock_entries |
| 00034 | seed_approval_configs.sql | Seed default approval configs function |
