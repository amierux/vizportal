# VizPortal Phase 5: Online Forms & Dashboard — Design Spec

**Date:** 2026-04-14
**Project:** VizPortal — Multi-tenant internal portal for VizServe Inc.
**Phase:** 5 — Forms & Dashboard/Analytics
**Depends on:** Phase 1-4 (all existing modules)

---

## 1. Overview

Phase 5 adds two modules:

1. **Online Forms** — Drag-and-drop form builder with 13 field types, advanced conditional logic (show/hide, skip, required-if, calculated fields), validation rules, sections with branching. Forms can be assigned internally, shared via public link, or auto-distributed on schedule. Submissions support approval workflows, save to workspace list, and export. File uploads and digital signatures supported.

2. **Dashboard/Analytics** — Customizable widget-based dashboard. Pre-built widget library pulling from all existing modules (attendance, leave, overtime, payroll, workspace, timesheet, forms). Chart widgets (bar, pie, line) via recharts. Role-based default layouts. Users add/remove/reorder/resize widgets.

---

## 2. Online Forms — Database Schema

### 2.1 `forms`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, NOT NULL | |
| name | TEXT | NOT NULL | |
| description | TEXT | | |
| status | TEXT | CHECK ('draft','published','archived'), DEFAULT 'draft' | |
| created_by | UUID | FK profiles, NOT NULL | |
| is_public | BOOLEAN | DEFAULT false, NOT NULL | Shareable link |
| public_token | UUID | DEFAULT gen_random_uuid(), UNIQUE | For public URL |
| approval_enabled | BOOLEAN | DEFAULT false, NOT NULL | |
| save_to_list_enabled | BOOLEAN | DEFAULT false, NOT NULL | |
| target_list_id | UUID | FK workspace_lists | Nullable |
| schedule_enabled | BOOLEAN | DEFAULT false, NOT NULL | |
| schedule_cron | TEXT | | Cron expression |
| schedule_target | TEXT | CHECK ('all_employees','department','specific') | |
| schedule_target_ids | UUID[] | DEFAULT '{}' | Dept or profile IDs |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.2 `form_sections`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| form_id | UUID | FK forms ON DELETE CASCADE, NOT NULL | |
| name | TEXT | NOT NULL | |
| description | TEXT | | |
| position | INTEGER | NOT NULL | |
| condition | JSONB | | Skip logic: `{ field_id, operator, value }` |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.3 `form_fields`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| section_id | UUID | FK form_sections ON DELETE CASCADE, NOT NULL | |
| form_id | UUID | FK forms ON DELETE CASCADE, NOT NULL | |
| name | TEXT | NOT NULL | Internal name |
| label | TEXT | NOT NULL | Display label |
| type | TEXT | CHECK (13 types), NOT NULL | text, number, date, textarea, select, multi_select, checkbox, radio, file, signature, email, phone, calculated |
| position | INTEGER | NOT NULL | |
| is_required | BOOLEAN | DEFAULT false, NOT NULL | |
| placeholder | TEXT | | |
| help_text | TEXT | | |
| options | JSONB | DEFAULT '[]' | For select/radio/checkbox: `[{ value, label }]` |
| validation_rules | JSONB | DEFAULT '{}' | `{ min, max, pattern, custom_error }` |
| conditional_logic | JSONB | DEFAULT '{}' | `{ visibility, required_if, calculated }` |
| default_value | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.4 `form_submissions`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| form_id | UUID | FK forms, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| submitted_by | UUID | FK profiles | NULL for public |
| respondent_name | TEXT | | For public submissions |
| respondent_email | TEXT | | For public submissions |
| status | TEXT | CHECK ('draft','submitted','approved','rejected'), DEFAULT 'submitted' | |
| data | JSONB | NOT NULL | `{ field_id: value }` |
| saved_to_list | BOOLEAN | DEFAULT false | |
| workspace_task_id | UUID | FK workspace_tasks | |
| submitted_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.5 `form_assignments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| form_id | UUID | FK forms, NOT NULL | |
| profile_id | UUID | FK profiles, NOT NULL | |
| assigned_at | TIMESTAMPTZ | DEFAULT now() | |
| completed | BOOLEAN | DEFAULT false, NOT NULL | |

### 2.6 `form_approval_configs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| form_id | UUID | FK forms ON DELETE CASCADE, UNIQUE, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.7 `form_approval_steps`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| form_approval_config_id | UUID | FK form_approval_configs ON DELETE CASCADE, NOT NULL | |
| step_order | INTEGER | NOT NULL | |
| role | TEXT | NOT NULL | 'team_leader', 'dept_manager', etc. |
| is_optional | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## 3. Online Forms — Conditional Logic

### 3.1 Visibility Conditions

Per field or per section: `{ field_id, operator, value }`

**Operators:** equals, not_equals, contains, not_contains, greater_than, less_than, is_empty, is_not_empty

When condition evaluates to false, field/section is hidden and its value excluded from submission data.

### 3.2 Required-If Conditions

Per field: `{ field_id, operator, value }`

Field becomes required only when condition is true. Otherwise optional.

### 3.3 Skip Logic

Per section: `{ field_id, operator, value }`

When condition is false, entire section is skipped (hidden). Form jumps to next visible section.

### 3.4 Calculated Fields

Type = 'calculated'. Formula stored in conditional_logic: `{ calculated: { formula: "field_xxx + field_yyy * 2" } }`

Supports: field references by ID, numeric operators (+, -, *, /), constants. Evaluated client-side in real-time as user fills the form.

### 3.5 Validation Rules

Per field: `{ min, max, pattern, custom_error }`

- `min`/`max` — for numbers and text length
- `pattern` — regex for text/email/phone validation
- `custom_error` — message shown on validation failure

---

## 4. Online Forms — Form Builder UI

### 4.1 Route

`/forms/builder/[formId]` — admin only

### 4.2 Layout

Three-panel layout:
- **Left:** Field type palette. 13 field types as clickable/draggable cards. Click adds to end of current section.
- **Center:** Live form preview. Shows sections and fields in order. Click field to select. Drag to reorder. Section headers with add/delete/reorder.
- **Right:** Properties panel. Shows selected field's settings: label, name, type, required, placeholder, help text, options (for select/radio), validation rules, conditional logic editor.

### 4.3 Conditional Logic Editor

In the right panel, when a field is selected:
- **Visibility:** "Show this field if" + field dropdown + operator dropdown + value input
- **Required if:** "Require this field if" + same pattern
- For sections: "Show this section if" + same pattern

For calculated fields:
- Formula builder: field dropdown + operator (+, -, *, /) + field dropdown or constant

### 4.4 Form Settings

Tab in the builder:
- Name, description
- Approval: enable toggle + chain editor
- Save to list: enable toggle + workspace list dropdown
- Public link: toggle + display generated URL
- Schedule: enable toggle + frequency (daily/weekly/monthly/custom cron) + target selector

---

## 5. Online Forms — Distribution

### 5.1 Internal Assignment

Admin assigns form to employees or departments. Creates `form_assignments` records. Employees see pending forms in My Forms and dashboard widget.

### 5.2 Public Link

Route: `/forms/public/[token]` (outside portal layout, no login required)
- Renders form with company logo
- Collects respondent name + email
- On submit, creates submission with no `submitted_by`

### 5.3 Scheduled Distribution

Cron job: `/api/cron/form-distribution`
- Runs daily, checks forms where `schedule_enabled = true`
- Parses `schedule_cron` to determine if today matches
- Creates `form_assignments` for target employees
- Sends notification + email

---

## 6. Online Forms — Submissions

### 6.1 Filing Flow

1. User fills form (conditional logic evaluated client-side)
2. Client-side validation (required fields, validation rules, calculated fields)
3. Submit → data stored as JSONB `{ field_id: value }`
4. File uploads → Supabase Storage: `{company_id}/forms/{form_id}/{submission_id}/{filename}`
5. Signature → base64 PNG uploaded same path
6. If `save_to_list_enabled` → create workspace task in target list
7. If `approval_enabled` → trigger approval chain
8. Mark `form_assignments.completed = true` if applicable

### 6.2 My Forms

Route: `/forms/my-forms`
- Assigned forms (pending/completed)
- Own submissions with status

### 6.3 Form Management

Route: `/forms`
- Admin: all forms, create/edit/archive/publish
- Per form: submissions table, export CSV/PDF
- Submission detail: view formatted data, approval status

---

## 7. Online Forms — Routes

| Route | Roles | Description |
|-------|-------|-------------|
| `/forms` | admin, hr | Form management |
| `/forms/my-forms` | all | My assigned forms + submissions |
| `/forms/builder/[formId]` | admin | Form builder |
| `/forms/[formId]/submissions` | admin, hr | View submissions |
| `/forms/public/[token]` | public | Public form (no login) |
| `/settings/forms` | admin | Form settings |

---

## 8. Dashboard — Database Schema

### 8.1 `dashboard_widgets`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| profile_id | UUID | FK profiles ON DELETE CASCADE, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| widget_type | TEXT | NOT NULL | Widget identifier |
| position | INTEGER | NOT NULL | Order |
| size | TEXT | CHECK ('small','medium','large'), DEFAULT 'small' | Col span: 1, 2, 3 |
| config | JSONB | DEFAULT '{}' | Widget-specific settings |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## 9. Dashboard — Widget Library

### 9.1 Data Widgets (small)

| Widget Type | Label | Data Source |
|-------------|-------|-------------|
| `attendance_today` | Attendance Today | daily_attendance_summary |
| `late_count_month` | Late Count This Month | daily_attendance_summary |
| `overtime_month` | Overtime This Month | overtime_requests |
| `my_tasks_summary` | My Tasks | workspace_tasks |
| `overdue_tasks` | Overdue Tasks | workspace_tasks |
| `timesheet_week` | Timesheet This Week | workspace_time_entries |
| `pending_approvals` | Pending Approvals | approval_requests |
| `pending_forms` | Pending Forms | form_assignments |

### 9.2 Info Widgets (medium)

| Widget Type | Label | Data Source |
|-------------|-------|-------------|
| `leave_balances` | Leave Balances | leave_balances |
| `upcoming_leaves` | Upcoming Leaves | leave_requests |
| `payroll_summary` | Latest Payroll | payroll_entries |
| `attendance_rate_month` | Monthly Attendance Rate | daily_attendance_summary (donut chart) |
| `leave_usage_type` | Leave Usage by Type | leave_requests (pie chart) |
| `task_completion_rate` | Task Completion Rate | workspace_tasks (bar chart) |
| `team_task_progress` | Team Task Progress | workspace_tasks (bar chart) |
| `headcount_department` | Headcount by Dept | profiles + departments (bar chart) |

### 9.3 Chart Widgets (large)

| Widget Type | Label | Data Source |
|-------------|-------|-------------|
| `attendance_trend` | Attendance Trend | daily_attendance_summary (line chart) |
| `payroll_cost_trend` | Payroll Cost Trend | payroll_entries (line chart) |
| `department_comparison` | Department Comparison | multi-source (grouped bar chart) |

---

## 10. Dashboard — UI

### 10.1 Route

`/dashboard` — all authenticated users

### 10.2 Layout

- 3-column grid on desktop, 2 on tablet, 1 on mobile
- Each widget is a Card with: title, content/chart, optional "View All" link
- "Customize" button in header opens side panel
- Side panel: available widgets list (toggleable), drag to reorder, size selector per widget

### 10.3 Role-Based Defaults

On first visit (no saved widgets), seed defaults:

**Member:** attendance_today, leave_balances, my_tasks_summary, timesheet_week, pending_forms

**TL/DM:** + team_task_progress, pending_approvals, upcoming_leaves

**Admin/HR/Director:** + headcount_department, attendance_trend, payroll_summary, department_comparison, payroll_cost_trend

### 10.4 Widget Data Fetching

Each widget type has a server action that fetches its data. Client component renders the widget based on type + fetched data. Widgets fetch independently (no single mega-query).

---

## 11. Navigation

**Sidebar additions:**
- "Forms" with `FileText` icon — before Workspace

**Settings nav:**
- "Forms" tab — form settings (default approval chain, storage limits)

**Dashboard** already exists in sidebar — just replace the page content.

---

## 12. Implementation Cycles

**Cycle 1: Online Forms**
- Migrations (7 tables)
- Types, routes, navigation
- Form builder (builder UI, field palette, properties panel, conditional logic editor)
- Form CRUD server actions
- Form submission (fill, validate, submit, file upload, signature)
- Public form page
- My Forms page
- Form management (admin)
- Approval integration
- Save-to-list integration
- Form distribution cron

**Cycle 2: Dashboard**
- Dashboard widget table migration
- Widget data actions (19 server actions, one per widget type)
- Widget components (19 components)
- Dashboard page with grid layout
- Customization panel (add/remove/reorder/resize)
- Role-based default seeding
- Chart rendering with recharts

---

## 13. New Dependencies

None — recharts already installed. Signature capture can use HTML5 Canvas (no extra library).
