# VizPortal Phase 2: Core HR — Design Spec

**Date:** 2026-04-13
**Project:** VizPortal — Multi-tenant internal portal for VizServe Inc.
**Phase:** 2 — Core HR (Attendance, Leave & Vacation, Approval Engine)
**Depends on:** Phase 1 (Auth, Company Info, Employee Info)

---

## 1. Overview

Phase 2 adds three interconnected modules to VizPortal:

1. **Approval Engine** — Generic, reusable two-step approval workflow (TL → DM) with email notifications. Used by attendance and leave modules, extensible to future phases.
2. **Attendance** — Clock-in/out with selfie + GPS, multi-session per day, cross-midnight support, schedule-based lateness/undertime detection, manual clock requests with approval.
3. **Leave & Vacation** — Configurable leave types (PH statutory pre-seeded), annual balance management with carry-over, leave requests with approval, team calendar.

**Tech stack:** Same as Phase 1 — Next.js 16 (App Router), Supabase (Auth, Postgres, Storage, Edge Functions), Tailwind + shadcn/ui, Zod, Vitest. Addition: Resend (transactional email), recharts (charts).

---

## 2. Database Schema

### 2.1 `employee_schedules`

One fixed schedule per employee. Defines expected work hours for lateness/undertime calculations.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| profile_id | UUID | FK profiles(id), UNIQUE, NOT NULL | One schedule per employee |
| company_id | UUID | FK companies(id), NOT NULL | Tenant isolation |
| work_type | TEXT | CHECK ('full_time', 'part_time'), NOT NULL | |
| start_time | TIME | NOT NULL | e.g., 08:00 |
| end_time | TIME | NOT NULL | e.g., 17:00 |
| work_days | TEXT[] | NOT NULL | e.g., {'mon','tue','wed','thu','fri'} |
| timezone | TEXT | NOT NULL, DEFAULT 'Asia/Singapore' | Display timezone |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** profile_id (unique), company_id
**Trigger:** updated_at auto-update

### 2.2 `clock_entries`

Every clock event. Multiple entries per day supported for pause/resume.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| profile_id | UUID | FK profiles(id), NOT NULL | |
| type | TEXT | CHECK ('clock_in', 'clock_out'), NOT NULL | |
| timestamp | TIMESTAMPTZ | NOT NULL | Actual clock time |
| selfie_url | TEXT | | Compressed selfie in Supabase Storage |
| latitude | DECIMAL(10,7) | | GPS coordinate |
| longitude | DECIMAL(10,7) | | GPS coordinate |
| is_manual | BOOLEAN | DEFAULT false, NOT NULL | true = filed via manual request |
| manual_remarks | TEXT | | Set after manual approval e.g., "Manual entry (approved)" |
| date | DATE | NOT NULL | Work date (not calendar date — handles cross-midnight) |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** company_id, profile_id, (profile_id, date)
**Note:** `date` is the employee's scheduled work date. If an employee starts at 8AM Apr 14 and finishes at 2AM Apr 15, both entries have date = 2026-04-14.

### 2.3 `daily_attendance_summary`

Computed summary per employee per date. Updated on each clock event.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| profile_id | UUID | FK profiles(id), NOT NULL | |
| company_id | UUID | FK companies(id), NOT NULL | |
| date | DATE | NOT NULL | UNIQUE with profile_id |
| total_hours | DECIMAL(5,2) | DEFAULT 0, NOT NULL | Sum of all sessions |
| required_hours | DECIMAL(5,2) | NOT NULL | From employee's schedule |
| is_late | BOOLEAN | DEFAULT false, NOT NULL | First clock_in > start_time |
| late_minutes | INTEGER | DEFAULT 0, NOT NULL | |
| is_early_out | BOOLEAN | DEFAULT false, NOT NULL | Last clock_out < end_time |
| early_out_minutes | INTEGER | DEFAULT 0, NOT NULL | |
| is_undertime | BOOLEAN | DEFAULT false, NOT NULL | total_hours < required_hours |
| undertime_minutes | INTEGER | DEFAULT 0, NOT NULL | |
| overtime_minutes | INTEGER | DEFAULT 0, NOT NULL | total_hours > required_hours |
| has_missing_entry | BOOLEAN | DEFAULT false, NOT NULL | Odd clock entries count |
| status | TEXT | CHECK ('present','late','absent','half_day','on_leave'), DEFAULT 'absent', NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** company_id, (profile_id, date) UNIQUE
**Trigger:** updated_at auto-update

### 2.4 `leave_types`

Configurable per company. PH statutory types pre-seeded.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| name | TEXT | NOT NULL | e.g., "Vacation Leave" |
| code | TEXT | NOT NULL | e.g., "VL" |
| default_days | DECIMAL(5,1) | NOT NULL | Annual allocation |
| is_paid | BOOLEAN | DEFAULT true, NOT NULL | |
| applicable_gender | TEXT | CHECK ('all','male','female'), DEFAULT 'all', NOT NULL | |
| requires_attachment | BOOLEAN | DEFAULT false, NOT NULL | e.g., medical cert for SL |
| is_carry_over | BOOLEAN | DEFAULT false, NOT NULL | |
| max_carry_over_days | DECIMAL(5,1) | DEFAULT 0, NOT NULL | Max days to roll over |
| is_active | BOOLEAN | DEFAULT true, NOT NULL | Soft delete |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** company_id, UNIQUE(company_id, code)
**Trigger:** updated_at auto-update

**PH statutory defaults seeded per company:**

| Code | Name | Days | Gender | Paid | Carry Over | Max Carry |
|------|------|------|--------|------|------------|-----------|
| VL | Vacation Leave | 5 | all | yes | yes | 5 |
| SL | Sick Leave | 5 | all | yes | no | 0 |
| ML | Maternity Leave | 105 | female | yes | no | 0 |
| PL | Paternity Leave | 7 | male | yes | no | 0 |
| SPL | Solo Parent Leave | 7 | all | yes | no | 0 |
| VAWC | VAWC Leave | 10 | female | yes | no | 0 |
| SLW | Special Leave for Women | 60 | female | yes | no | 0 |

### 2.5 `leave_settings`

Company-wide leave configuration.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), UNIQUE, NOT NULL | One per company |
| reset_month | INTEGER | CHECK (1-12), DEFAULT 1, NOT NULL | Month of annual reset |
| reset_day | INTEGER | CHECK (1-31), DEFAULT 1, NOT NULL | Day of reset |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Trigger:** updated_at auto-update

### 2.6 `leave_balances`

Per employee, per leave type, per year.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| profile_id | UUID | FK profiles(id), NOT NULL | |
| company_id | UUID | FK companies(id), NOT NULL | |
| leave_type_id | UUID | FK leave_types(id), NOT NULL | |
| year | INTEGER | NOT NULL | e.g., 2026 |
| total_days | DECIMAL(5,1) | NOT NULL | Allocated (default + carried over) |
| used_days | DECIMAL(5,1) | DEFAULT 0, NOT NULL | |
| remaining_days | DECIMAL(5,1) | NOT NULL | Computed: total - used |
| carried_over_days | DECIMAL(5,1) | DEFAULT 0, NOT NULL | From previous year |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** UNIQUE(profile_id, leave_type_id, year), company_id
**Trigger:** updated_at auto-update

### 2.7 `leave_requests`

Individual leave applications.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| profile_id | UUID | FK profiles(id), NOT NULL | Requester |
| leave_type_id | UUID | FK leave_types(id), NOT NULL | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NOT NULL | |
| total_days | DECIMAL(5,1) | NOT NULL | Calculated excl. non-work-days |
| reason | TEXT | | |
| attachment_url | TEXT | | Supporting doc if required |
| status | TEXT | CHECK ('pending','approved','rejected','cancelled'), DEFAULT 'pending', NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** company_id, profile_id, (profile_id, start_date, end_date)
**Trigger:** updated_at auto-update

### 2.8 `approval_requests`

Generic approval engine. Any module creates a row here to trigger the approval workflow.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| company_id | UUID | FK companies(id), NOT NULL | |
| type | TEXT | NOT NULL | 'manual_clock', 'leave_request' (extensible) |
| reference_id | UUID | NOT NULL | FK to source record (clock_entries.id or leave_requests.id) |
| requester_id | UUID | FK profiles(id), NOT NULL | |
| status | TEXT | CHECK ('pending','approved','rejected','cancelled'), DEFAULT 'pending', NOT NULL | |
| current_step | INTEGER | DEFAULT 1, NOT NULL | Active step number |
| total_steps | INTEGER | NOT NULL | 2 for TL→DM, 1 if only one approver |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** company_id, requester_id, (type, reference_id), status
**Trigger:** updated_at auto-update

### 2.9 `approval_steps`

Each step in the approval chain.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| approval_request_id | UUID | FK approval_requests(id), NOT NULL | |
| step_order | INTEGER | NOT NULL | 1 = TL, 2 = DM |
| approver_id | UUID | FK profiles(id), NOT NULL | |
| status | TEXT | CHECK ('pending','approved','rejected'), DEFAULT 'pending', NOT NULL | |
| comment | TEXT | | Approver's remark |
| decided_at | TIMESTAMPTZ | | When decision was made |
| email_sent_at | TIMESTAMPTZ | | When notification email was sent |
| reminder_sent_at | TIMESTAMPTZ | | When 3-day reminder was sent |
| token | UUID | DEFAULT gen_random_uuid(), UNIQUE, NOT NULL | For email approval link |
| created_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | |

**Indexes:** approval_request_id, approver_id, token (unique)

---

## 3. Approval Engine

### 3.1 Flow Mechanics

**Request creation:**
1. Module creates source record (clock_entries or leave_requests)
2. System looks up requester's department → finds TL (`departments.team_leader_id`) and DM (`departments.manager_id`)
3. Creates `approval_request` with appropriate `total_steps`
4. Creates `approval_steps` — one per approver
5. Sends email to step 1 approver

**Step progression:**
- Step N approver approves → if more steps, advance `current_step`, email next approver
- Step N approver rejects → entire request rejected, requester notified
- All steps approved → request approved, side effects applied

**Edge cases:**
- No TL assigned → skip to DM (single-step approval)
- No DM assigned → TL approval is final (single-step)
- Neither assigned → auto-route to any user with HR role in the company (fallback)
- Requester cancels → all pending steps cancelled, approvers notified

**Side effects on final approval:**
- `manual_clock`: Set `clock_entries.manual_remarks = "Manual entry (approved)"`, recalculate `daily_attendance_summary`
- `leave_request`: Update `leave_requests.status = 'approved'`, increment `leave_balances.used_days`, decrement `remaining_days`

### 3.2 Approval Link Page

**Route:** `/approvals/[token]` (public, token-authenticated)

- Token looked up in `approval_steps`
- If token valid and step pending → show request details, comment field, Approve/Reject buttons
- If token already used → show "Already decided" with the decision
- If token not found → 404
- No login required — the token is the authentication

### 3.3 My Approvals Inbox

**Route:** `/approvals` (authenticated, all roles)

- Lists all `approval_steps` where `approver_id = current_user` and `status = pending`
- Shows: request type, requester name, date submitted, details
- Can approve/reject inline with comment
- Filter by type (manual clock, leave)

---

## 4. Email Notifications

### 4.1 Provider

Resend (resend.com) — transactional email service. Simple API, good deliverability, free tier sufficient for VizServe's volume.

### 4.2 Email Events

| Event | Recipient | Subject Template |
|-------|-----------|-----------------|
| Request submitted | Requester | "[VizPortal] Your {type} request has been submitted" |
| Approval needed | Current step approver | "[VizPortal] Approval needed: {type} from {requester}" |
| Step approved | Requester | "[VizPortal] {approver} approved your {type} request" |
| Step approved (next) | Next step approver | "[VizPortal] Approval needed: {type} from {requester}" |
| Fully approved | Requester | "[VizPortal] Your {type} request has been approved" |
| Rejected | Requester | "[VizPortal] Your {type} request was rejected by {approver}" |
| 3-day reminder | Current step approver | "[VizPortal] Reminder: Pending approval for {type} from {requester}" |
| Request cancelled | All pending approvers | "[VizPortal] {requester} cancelled their {type} request" |

### 4.3 Email Content

All approval emails include:
- Request details (who, what, dates, reason)
- Direct link to approve/reject: `https://vizportal.vercel.app/approvals/{token}`
- The link opens the approval page where approver can comment and decide

### 4.4 Reminder Cron

A scheduled job runs daily (via Supabase pg_cron or Edge Function cron):
- Query: `approval_steps WHERE status = 'pending' AND created_at < now() - interval '3 days' AND reminder_sent_at IS NULL`
- Send reminder email to each approver
- Update `reminder_sent_at`

---

## 5. Attendance Module

### 5.1 Clock-In/Out Flow

1. Employee opens `/attendance` → sees live SGT clock (Asia/Singapore timezone)
2. Current status displayed: "Not clocked in" or "Clocked in since {time}" with running duration
3. Large "Clock In" button (or "Clock Out" if session active)
4. On tap:
   - Browser requests camera access → captures selfie
   - Client-side compression: JPEG quality ~40%, max 100KB
   - Browser Geolocation API captures lat/lng
   - Upload selfie to Supabase Storage: `{company_id}/attendance/{profile_id}/{date}/{uuid}.jpg`
5. `clock_entries` record created
6. `daily_attendance_summary` recalculated

### 5.2 Multi-Session / Pause-Resume

- Employee can clock out (pause) and clock in again (resume) any number of times per day
- Each clock-in/out creates a separate `clock_entries` record
- `daily_attendance_summary.total_hours` = sum of all completed sessions
- A session = time between a clock_in and the next clock_out for the same profile + date

### 5.3 Cross-Midnight Handling

The `date` field represents the scheduled work date, not the calendar date:
- Determined by the first clock_in of the work session
- If employee clocks in at 8AM Apr 14, clocks out at 2AM Apr 15 → both entries have `date = 2026-04-14`
- Rule: any clock entry within 4 hours after midnight inherits the previous calendar day as work date (configurable threshold)

### 5.4 Schedule-Based Detection

Calculated when `daily_attendance_summary` is recalculated:

| Detection | Logic |
|-----------|-------|
| **Late** | First clock_in of the day > schedule `start_time` (1 minute grace) |
| **Early out** | Last clock_out of the day < schedule `end_time` |
| **Missing entry** | Odd number of clock_entries for the date |
| **Undertime** | total_hours < required_hours (from schedule) |
| **Overtime** | total_hours > required_hours |
| **Status** | present (on time), late (first in late), absent (no entries on a work day), half_day (< 50% hours), on_leave (has approved leave for this date) |

### 5.5 Manual Clock Request

1. Employee opens Attendance → "File Manual Entry" button
2. Form: date, type (in/out), time, reason (required)
3. Submits → creates `clock_entries` with `is_manual = true`
4. Creates `approval_request` (type: `manual_clock`) → triggers TL → DM approval chain
5. On approval → `manual_remarks` set to "Manual entry (approved)", summary recalculated
6. On rejection → `clock_entries` record deleted, `daily_attendance_summary` recalculated, requester notified

### 5.6 Employee Schedule Setup

Added to employee detail page (Employment tab) or a new section:
- Work type: full-time / part-time dropdown
- Start time / End time: time pickers
- Work days: checkbox group (Mon-Sun)
- Timezone: defaults to Asia/Singapore
- HR/Admin can edit; employee can view only

### 5.7 UI Views

**My Attendance (`/attendance`):**
- Live SGT clock display
- Clock In/Out button with selfie capture
- Today's sessions list (each in/out pair with timestamps and duration)
- Total hours today vs required
- Weekly/monthly calendar view: color-coded days
  - Green = present (on time)
  - Yellow = late
  - Red = absent
  - Blue = on leave
  - Gray = non-work day
- Session history per selected day

**Team Attendance (`/attendance/team`) — TL/DM:**
- Department members' attendance for today
- Same calendar/history views scoped to department

**Attendance Management (`/attendance/manage`) — HR/Admin:**
- Daily attendance list: who's in, late, absent
- Filters: department, date range, status
- Individual employee attendance drill-down
- Monthly summary table: employee × metrics (days present, late count, total late minutes, undertime hours, overtime hours, absences)

**Attendance Reports (`/attendance/reports`) — HR/Admin:**
- Monthly summary report with filters
- Daily detail report
- Export to CSV
- Bar chart: department comparison (late/undertime/overtime for the month)

### 5.8 Routes

| Route | Roles | Description |
|-------|-------|-------------|
| `/attendance` | all | My Attendance — clock, history, calendar |
| `/attendance/team` | dept_manager, team_leader | Department attendance view |
| `/attendance/manage` | admin, hr | Company-wide attendance management |
| `/attendance/reports` | admin, hr | Reports & CSV export |

---

## 6. Leave & Vacation Module

### 6.1 Leave Type Management

**Route:** `/leave/settings` (admin only)

- CRUD table for leave types
- Fields: name, code, default days, paid/unpaid, gender applicability, requires attachment, carry-over (yes/no + max days), active/inactive
- PH statutory types pre-seeded on company creation (via `seed_company_defaults` extension)
- Leave settings: reset month and day for annual balance refresh

### 6.2 Leave Balance Management

- HR/Admin can view all employee balances at `/leave/manage`
- Table: employee × leave type (used/remaining for current year)
- Click employee to adjust balances manually
- Filter by department, year

**Annual reset logic (triggered by cron on reset date):**
1. For each active employee:
2. For each active leave type:
3. Calculate carry-over: `min(previous_year.remaining_days, leave_type.max_carry_over_days)` if `is_carry_over = true`, else 0
4. Create new year balance: `total_days = leave_type.default_days + carried_over_days`
5. `used_days = 0`, `remaining_days = total_days`

**New employee prorating:**
When an employee is created (via invitation), their balance for each leave type is prorated:
`prorated_days = default_days × (months_remaining_until_reset / 12)` rounded to nearest 0.5

### 6.3 Filing a Leave Request

1. Employee opens `/leave` → sees balance cards for each applicable leave type
2. Clicks "File Leave"
3. Form: leave type (filtered by gender), start date, end date, reason, attachment (if required by type)
4. System calculates `total_days` — counts only the employee's work days between start and end date (excludes non-work-days per schedule)
5. Validations:
   - Sufficient remaining balance
   - No overlapping approved leaves for the same dates
   - Leave type applicable to employee's gender
   - Attachment provided if type requires it
6. Submits → creates `leave_requests` + `approval_request` → TL → DM chain
7. On final approval → `leave_balances.used_days += total_days`, `remaining_days -= total_days`
8. On rejection → no balance change
9. Employee can cancel pending requests → balance unchanged, approvers notified

### 6.4 Leave Calendar

**Route:** `/leave/team` (TL/DM) and `/leave/manage` (HR/Admin)

- Monthly calendar showing approved leaves
- Each leave shown as a colored bar spanning start-end dates
- Color-coded by leave type
- TL/DM sees department only; HR/Admin sees all
- Helps approvers check team coverage before approving

### 6.5 UI Views

**My Leave (`/leave`):**
- Balance cards: each leave type with progress bar (used/total), remaining days highlighted
- My requests list: status badge, dates, type, approval progress indicator
- "File Leave" button

**Team Leaves (`/leave/team`) — TL/DM:**
- Department leave calendar
- Pending requests in department
- Approve/reject inline

**Leave Management (`/leave/manage`) — HR/Admin:**
- All leave requests with filters (status, department, leave type, date range)
- Employee balance overview table
- Manual balance adjustment dialog
- Export to CSV

**Leave Settings (`/leave/settings`) — Admin:**
- Leave types CRUD table
- Reset date configuration

**Leave Reports (included in `/leave/manage`):**
- Leave balance report: all employees × all types (used/remaining)
- Leave usage report: approved leaves in date range, grouped by type or department
- Pie chart: leave type distribution for the month
- Export to CSV

### 6.6 Routes

| Route | Roles | Description |
|-------|-------|-------------|
| `/leave` | all | My Leave — balances, requests, file new |
| `/leave/team` | dept_manager, team_leader | Department calendar & requests |
| `/leave/manage` | admin, hr | Company-wide leave management & reports |
| `/leave/settings` | admin | Leave types CRUD, reset date config |

---

## 7. RLS Policies (New Tables)

All new tables follow the same pattern as Phase 1:

**Company isolation:** All queries scoped by `company_id = get_user_company_id()`

**Role-based access:**

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| employee_schedules | Admin/HR: all. TL/DM: own dept. Member: own. | Admin/HR | Admin/HR | Admin/HR |
| clock_entries | Admin/HR: all. TL/DM: own dept. Member: own. | All (own) | Admin/HR (manual remarks) | Admin/HR |
| daily_attendance_summary | Admin/HR: all. TL/DM: own dept. Member: own. | System only | System only | — |
| leave_types | All (read) | Admin | Admin | Admin |
| leave_settings | Admin | Admin | Admin | — |
| leave_balances | Admin/HR: all. Member: own. | Admin/HR | Admin/HR | — |
| leave_requests | Admin/HR: all. TL/DM: own dept. Member: own. | All (own) | Admin/HR + own (cancel only) | — |
| approval_requests | Admin/HR: all. Approver: assigned. Requester: own. | System/module | System | — |
| approval_steps | Admin/HR: all. Approver: own steps. Requester: own request's steps. | System | Approver (own step) | — |

---

## 8. Route Map Update

New entries for `ROUTE_ROLE_MAP` in `src/lib/constants.ts`:

```typescript
"/attendance": [],                    // All authenticated
"/attendance/team": ["dept_manager", "team_leader"],
"/attendance/manage": ["admin", "hr"],
"/attendance/reports": ["admin", "hr"],
"/leave": [],                         // All authenticated
"/leave/team": ["dept_manager", "team_leader"],
"/leave/manage": ["admin", "hr"],
"/leave/settings": ["admin"],
"/approvals": [],                     // All authenticated
```

---

## 9. New Dependencies

| Package | Purpose |
|---------|---------|
| resend | Transactional email sending |
| recharts | Charts for reports |
| browser-image-compression | Client-side selfie compression |

---

## 10. Storage Structure

```
vizportal-storage/
  {company_id}/
    attendance/
      {profile_id}/
        {date}/
          {uuid}.jpg          # Compressed selfie (~100KB)
    documents/                 # Existing from Phase 1
    avatars/                   # Existing from Phase 1
    leave/
      {profile_id}/
        {leave_request_id}.pdf  # Leave attachments
```

---

## 11. Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Approval reminder | Daily at 9AM SGT | Send reminder email for pending approvals older than 3 days |
| Annual leave reset | Daily at midnight SGT | Check if today is company's reset date; if so, reset all balances |
| Mark absences | Daily at 11:59PM SGT | For employees with schedules who have no clock entries today, create `daily_attendance_summary` with status `absent` (skip if on approved leave) |

---

## 12. Reports & Export

### Attendance Reports

**Monthly Attendance Summary:**
- Table: employees × metrics (days present, late count, total late minutes, early-out count, undertime hours, overtime hours, absences)
- Filters: month/year, department, employment status
- Export to CSV

**Daily Attendance Report:**
- All employees for a specific date: clock times, total hours, status
- Export to CSV

### Leave Reports

**Leave Balance Report:**
- Table: employees × leave types (used/remaining for selected year)
- Filter: department, year
- Export to CSV

**Leave Usage Report:**
- All approved leaves in date range, grouped by type or department
- Export to CSV

### Charts

- Attendance: Bar chart — department-level late/undertime/overtime comparison
- Leave: Pie chart — leave type distribution

Built with recharts.

---

## 13. Phase Roadmap Reference

| Phase | Modules | Status |
|-------|---------|--------|
| **1 — Foundation** | Auth, Company Info, Employee Info | Deployed |
| **2 — Core HR** | Attendance, Leave & Vacation, Approval Engine | This spec |
| **3 — Productivity** | Productivity (tasks/workspace), Timesheet | Not started |
| **4 — Forms & Dashboard** | Online Forms, Dashboard/Analytics | Not started |
