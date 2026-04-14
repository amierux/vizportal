# VizPortal Phase 4: Workspace & Timesheet — Design Spec

**Date:** 2026-04-14
**Project:** VizPortal — Multi-tenant internal portal for VizServe Inc.
**Phase:** 4 — Productivity
**Depends on:** Phase 1-3 (Auth, Employee Info, Attendance, Leave, Overtime, Payroll, Approval Engine, Notifications)

---

## 1. Overview

Phase 4 adds two interconnected modules:

1. **Workspace** — ClickUp-style project/task management with folder hierarchy, multiple views (List, Kanban, Gantt, Calendar), per-folder permissions, custom statuses with optional approval workflow, task remarks, checklists, attachments, subtasks, recurring tasks, and templates.

2. **Timesheet** — Time logging on tasks (from task or from timesheet), weekly timesheet view with submission/approval flow, billable/non-billable tracking, Monday reminder cron, and integration with the workspace task system.

**Hierarchy:** Company → Folders → Lists → Tasks → Subtasks

---

## 2. Database Schema

### 2.1 `workspace_folders`

Top-level containers (projects/initiatives). Only TL, dept_manager, director can create.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, NOT NULL | |
| name | TEXT | NOT NULL | |
| description | TEXT | | |
| color | TEXT | DEFAULT '#6366f1' | Hex color |
| icon | TEXT | DEFAULT '📁' | Emoji |
| created_by | UUID | FK profiles, NOT NULL | |
| is_archived | BOOLEAN | DEFAULT false, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.2 `workspace_folder_members`

Per-folder access control.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| folder_id | UUID | FK workspace_folders ON DELETE CASCADE, NOT NULL | |
| profile_id | UUID | FK profiles, NOT NULL | |
| permission | TEXT | CHECK ('viewer','creator','editor','admin'), NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| UNIQUE(folder_id, profile_id) | | | |

**Permission levels:**
- `viewer` — read-only access to all tasks in the folder
- `creator` — can create tasks, edit own tasks
- `editor` — can create and edit any task
- `admin` — full control: edit folder settings, manage members, delete tasks

### 2.3 `workspace_folder_statuses`

Custom status set per folder. Inherited by all lists unless overridden.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| folder_id | UUID | FK workspace_folders ON DELETE CASCADE, NOT NULL | |
| name | TEXT | NOT NULL | e.g., "To Do", "In Progress" |
| color | TEXT | NOT NULL | Hex color |
| position | INTEGER | NOT NULL | Sort order |
| is_done | BOOLEAN | DEFAULT false, NOT NULL | Marks task as completed |
| requires_approval | BOOLEAN | DEFAULT false, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Default statuses seeded on folder creation:**
- To Do (#94a3b8, position 1, is_done=false)
- In Progress (#3b82f6, position 2, is_done=false)
- Review (#f59e0b, position 3, is_done=false)
- Done (#22c55e, position 4, is_done=true)

### 2.4 `workspace_status_approvers`

Approval config for statuses that have `requires_approval = true`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| status_id | UUID | FK workspace_folder_statuses ON DELETE CASCADE, NOT NULL | |
| approval_mode | TEXT | CHECK ('hierarchical','any_one'), NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.5 `workspace_status_approver_list`

Individual approvers for a status.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| status_approver_id | UUID | FK workspace_status_approvers ON DELETE CASCADE, NOT NULL | |
| profile_id | UUID | FK profiles, NOT NULL | |
| step_order | INTEGER | NOT NULL | For hierarchical mode |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.6 `workspace_lists`

Lists inside folders.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| folder_id | UUID | FK workspace_folders ON DELETE CASCADE, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| name | TEXT | NOT NULL | |
| description | TEXT | | |
| position | INTEGER | NOT NULL | Sort order within folder |
| status_override | BOOLEAN | DEFAULT false, NOT NULL | Use own statuses instead of folder's |
| created_by | UUID | FK profiles, NOT NULL | |
| is_archived | BOOLEAN | DEFAULT false, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.7 `workspace_list_statuses`

Override statuses for lists with `status_override = true`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| list_id | UUID | FK workspace_lists ON DELETE CASCADE, NOT NULL | |
| name | TEXT | NOT NULL | |
| color | TEXT | NOT NULL | |
| position | INTEGER | NOT NULL | |
| is_done | BOOLEAN | DEFAULT false, NOT NULL | |
| requires_approval | BOOLEAN | DEFAULT false, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.8 `workspace_tasks`

Core task entity. Subtasks use `parent_task_id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| list_id | UUID | FK workspace_lists ON DELETE CASCADE, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| parent_task_id | UUID | FK workspace_tasks, NULL | NULL = top-level task |
| name | TEXT | NOT NULL | |
| description | TEXT | | Rich text / markdown |
| status_id | UUID | NOT NULL | References folder_statuses or list_statuses |
| assignee_id | UUID | FK profiles | PIC (Person In Charge) |
| created_by | UUID | FK profiles, NOT NULL | |
| start_date | DATE | | |
| target_end_date | DATE | | |
| completed_at | TIMESTAMPTZ | | Set when status is_done = true |
| priority | TEXT | CHECK ('urgent','high','medium','low','none'), DEFAULT 'none' | |
| position | INTEGER | NOT NULL | Sort order within list |
| is_recurring | BOOLEAN | DEFAULT false, NOT NULL | |
| recurrence_rule | JSONB | | { interval, every, carry_over_checklist, carry_over_subtasks } |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.9 `workspace_task_attachments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| task_id | UUID | FK workspace_tasks ON DELETE CASCADE, NOT NULL | |
| file_url | TEXT | NOT NULL | |
| file_name | TEXT | NOT NULL | |
| uploaded_by | UUID | FK profiles, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.10 `workspace_task_remarks`

Append-only comment thread with timestamp.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| task_id | UUID | FK workspace_tasks ON DELETE CASCADE, NOT NULL | |
| profile_id | UUID | FK profiles, NOT NULL | |
| content | TEXT | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.11 `workspace_task_checklists`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| task_id | UUID | FK workspace_tasks ON DELETE CASCADE, NOT NULL | |
| name | TEXT | NOT NULL | |
| position | INTEGER | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.12 `workspace_checklist_items`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| checklist_id | UUID | FK workspace_task_checklists ON DELETE CASCADE, NOT NULL | |
| name | TEXT | NOT NULL | |
| is_checked | BOOLEAN | DEFAULT false, NOT NULL | |
| position | INTEGER | NOT NULL | |
| assignee_id | UUID | FK profiles | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.13 `workspace_task_approvals`

Tracks status change approval requests.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| task_id | UUID | FK workspace_tasks, NOT NULL | |
| from_status_id | UUID | NOT NULL | Previous status |
| to_status_id | UUID | NOT NULL | Target status |
| requested_by | UUID | FK profiles, NOT NULL | |
| status | TEXT | CHECK ('pending','approved','rejected'), DEFAULT 'pending' | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.14 `workspace_task_approval_steps`

Individual approver decisions.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| task_approval_id | UUID | FK workspace_task_approvals ON DELETE CASCADE, NOT NULL | |
| approver_id | UUID | FK profiles, NOT NULL | |
| step_order | INTEGER | NOT NULL | |
| status | TEXT | CHECK ('pending','approved','rejected'), DEFAULT 'pending' | |
| comment | TEXT | | |
| decided_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.15 `workspace_checklist_templates`

Reusable checklist templates.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, NOT NULL | |
| name | TEXT | NOT NULL | |
| items | JSONB | NOT NULL | Array of { name, position } |
| created_by | UUID | FK profiles, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.16 `workspace_list_templates`

Reusable list templates (statuses + default tasks structure).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, NOT NULL | |
| name | TEXT | NOT NULL | |
| template_data | JSONB | NOT NULL | { statuses: [], tasks: [{ name, checklists }] } |
| created_by | UUID | FK profiles, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.17 `workspace_time_entries`

Time logged on tasks.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| task_id | UUID | FK workspace_tasks, NOT NULL | |
| profile_id | UUID | FK profiles, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| duration_minutes | INTEGER | NOT NULL | Stored as minutes |
| description | TEXT | | Optional note |
| date | DATE | NOT NULL | Day the work was done |
| is_billable | BOOLEAN | DEFAULT false, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.18 `notifications`

Generic notification system (used by workspace and available to other modules).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, NOT NULL | |
| profile_id | UUID | FK profiles, NOT NULL | Recipient |
| type | TEXT | NOT NULL | e.g., 'task_created', 'task_status_changed' |
| title | TEXT | NOT NULL | |
| message | TEXT | NOT NULL | |
| link | TEXT | | URL to navigate to |
| is_read | BOOLEAN | DEFAULT false, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.19 `notification_preferences`

Per-user notification settings.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| profile_id | UUID | FK profiles, UNIQUE per event_type, NOT NULL | |
| event_type | TEXT | NOT NULL | |
| in_app | BOOLEAN | DEFAULT true, NOT NULL | |
| email | BOOLEAN | DEFAULT false, NOT NULL | |
| UNIQUE(profile_id, event_type) | | | |

### 2.20 `timesheet_settings`

Company-wide timesheet configuration.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, UNIQUE, NOT NULL | |
| reminder_email_addresses | TEXT[] | DEFAULT '{}', NOT NULL | Emails for Monday report |
| submission_deadline_day | TEXT | DEFAULT 'monday', NOT NULL | Day of week |
| is_approval_enabled | BOOLEAN | DEFAULT true, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.21 `timesheet_approval_configs`

Approval chain for timesheet submissions.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, UNIQUE, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.22 `timesheet_approval_steps`

Ordered approver roles for timesheet.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| timesheet_approval_config_id | UUID | FK timesheet_approval_configs ON DELETE CASCADE, NOT NULL | |
| step_order | INTEGER | NOT NULL | |
| role | TEXT | NOT NULL | 'team_leader', 'dept_manager', 'business_manager', 'director' |
| is_optional | BOOLEAN | DEFAULT false, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

Default seed: step 1 = team_leader (required).

### 2.23 `timesheet_submissions`

Weekly timesheet submission records.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| profile_id | UUID | FK profiles, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| week_start_date | DATE | NOT NULL | Monday |
| week_end_date | DATE | NOT NULL | Sunday |
| total_minutes | INTEGER | DEFAULT 0, NOT NULL | Sum of time entries for the week |
| status | TEXT | CHECK ('draft','submitted','approved','rejected'), DEFAULT 'draft', NOT NULL | |
| submitted_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |
| UNIQUE(profile_id, week_start_date) | | | |

---

## 3. Views

### 3.1 List View

Default table view at folder and list level.
- Columns: Task name (with indent for subtasks), PIC, Status, Priority, Start Date, Target End, Progress %
- Sortable, filterable by status/assignee/priority/date
- Inline status change (dropdown — triggers approval if required)
- Grouped by status (collapsible)

### 3.2 Kanban View

Board view at folder and list level.
- Columns = statuses in order
- Cards: task name, assignee avatar, priority badge, due date, subtask count
- Drag-and-drop between columns (triggers approval if target status requires it)

### 3.3 Gantt View

Timeline view at folder and list level.
- Horizontal bars per task: start_date → target_end_date
- Color-coded by status
- Drag to resize or move bars (updates dates)
- Subtask bars shown under parent

### 3.4 Calendar View

Month calendar at folder and list level.
- Tasks placed on target_end_date
- Color-coded by priority or status
- Click date to see all tasks due

### 3.5 My Tasks (`/workspace`)

Global view — all tasks assigned to current user across all folders/lists.
- Grouped: Overdue, Today, Upcoming, No Due Date
- Same filter/sort as List View

---

## 4. Task Detail View

Route: `/workspace/tasks/[taskId]`

Full task view showing:
- Name (editable inline)
- Description (markdown editor)
- Status dropdown (triggers approval if required)
- Assignee (PIC) selector
- Priority selector
- Start date + target end date pickers
- Subtasks list (add/view/complete)
- Checklists (add from template or create new, check/uncheck items)
- Attachments (upload/download/delete)
- Remarks section — always visible at bottom, text input to add new remark. Shows all previous remarks with user name + timestamp. Auto-includes approval actions.
- Time log section — "Log Time" button, list of time entries on this task

---

## 5. Permissions & Folder Management

### 5.1 Folder Creation

Only users with role `team_leader`, `dept_manager`, or `director` can create folders.

### 5.2 Folder Settings (Admin permission)

Folder admins can:
- Edit folder name, description, color, icon
- Manage members (add/remove, change permission level)
- Configure statuses (add/edit/reorder/delete)
- Set approval on statuses (enable, set mode, add approvers)
- Archive/delete folder

### 5.3 Permission Inheritance

Lists inherit folder membership. Tasks inherit list/folder permissions. No separate task-level member list — permissions flow down from folder.

---

## 6. Status Approval Flow

When a task is moved to a status with `requires_approval = true`:

1. Task enters "pending approval" state — visual indicator on the task
2. `workspace_task_approvals` record created
3. `workspace_task_approval_steps` records created per approver
4. Notification sent to approvers (in-app + email)
5. Approvers approve/reject with required comment
6. Comment auto-appended to task remarks: `[Approved by {name}] {comment} — {timestamp}`
7. **Hierarchical mode:** step 1 must approve before step 2 is notified. Any rejection stops the chain.
8. **Any-one mode:** first approval completes it. Any rejection rejects.
9. On approval: task status changes to target status
10. On rejection: task reverts to previous status, rejection remark added

---

## 7. Recurring Tasks

When a recurring task is completed (status changes to one with `is_done = true`):

1. System creates a new copy of the task
2. New task has same name, description, assignee, priority, list
3. Status reset to the first status (lowest position, is_done = false)
4. Dates shifted by recurrence interval (daily/weekly/monthly/custom)
5. If `carry_over_checklist`: unchecked items copied, checked items reset to unchecked
6. If `carry_over_subtasks`: incomplete subtasks copied to new task
7. Original completed task stays in the list as historical record

---

## 8. Templates

### 8.1 Checklist Templates

Created in Settings → Workspace or saved from an existing checklist on a task.
- Name + ordered list of items
- When applied to a task: creates a new checklist with the template items

### 8.2 List Templates

Saved from an existing list (captures statuses + task structure).
- Name + template_data JSON (statuses, tasks with names and checklists)
- When applied to a folder: creates a new list with the template's statuses and pre-populated tasks

---

## 9. Notifications

### 9.1 Event Types

| Event | Recipients | In-App | Email |
|-------|-----------|--------|-------|
| task_created | Assignee (PIC) | Yes | No |
| task_status_changed | Assignee + creator | Yes | No |
| task_completed | Assignee + creator | Yes | No |
| task_approval_needed | Approver(s) | Yes | Yes |
| task_approval_decided | Requester | Yes | Yes |
| task_mentioned | Mentioned user | Yes | No |
| task_due_soon | Assignee | Yes | Yes |
| timesheet_reminder | Non-compliant members | Yes | Yes |
| timesheet_approved | Submitter | Yes | Yes |
| timesheet_rejected | Submitter | Yes | Yes |

### 9.2 UI

- Bell icon in header with unread count badge (red dot with number)
- Click opens dropdown panel: recent 20 notifications
- Each notification: icon, title, message, relative time, click to navigate
- "Mark all read" button
- Notification preferences in user settings (toggle in-app/email per event type)

### 9.3 Cron: task_due_soon

Daily cron at 9AM company timezone:
- Query tasks where target_end_date = tomorrow and status is not done
- Send notification to assignee

---

## 10. Timesheet

### 10.1 Time Entry

**From task:** "Log Time" button on task detail. Form: date, duration (input with unit selector: minutes/hours/days — converted to minutes), description, billable toggle.

**From timesheet page:** Task autocomplete search (searches workspace_tasks assigned to user), then same duration/date/billable fields.

### 10.2 Timesheet Page (`/timesheet`)

**Weekly grid view:**
- Rows = tasks with logged time that week
- Columns = Mon through Sun + Total
- Cells = hours logged (click to edit)
- Add row: task search autocomplete
- Weekly total at bottom
- "Submit Week" button — creates/updates timesheet_submission

**Tabs (role-gated):**
- My Timesheet (all)
- Team (team_leader)
- Department (dept_manager)
- All Members (admin, HR, business_manager, director)

Each tab has date range filter + export CSV/PDF.

### 10.3 Submission Flow

1. Member clicks "Submit Week" for a completed week
2. System validates total_minutes meets `weekly_required_hours` (from employee_details) — warning if under, but allows submission
3. Creates/updates `timesheet_submissions` with status = 'submitted'
4. If approval enabled: triggers approval chain per `timesheet_approval_configs`
5. Approvers approve/reject with comment
6. Approved → status = 'approved'
7. Rejected → status = 'rejected', member can edit and resubmit

### 10.4 Monday Reminder Cron

Runs every Monday at 9AM (company timezone):
1. Query all active members
2. Check `timesheet_submissions` for the previous week (Mon-Sun)
3. Members with no submission or status = 'draft' → non-compliant
4. Send report email to `timesheet_settings.reminder_email_addresses` listing all non-compliant members
5. Send individual reminder notification/email to each non-compliant member

### 10.5 Timesheet Settings (`/settings/timesheet`)

- Reminder email addresses (multi-input)
- Submission deadline day (dropdown: Monday default)
- Enable/disable approval toggle
- Approval chain editor (same pattern as approval_configs: ordered roles with optional flag)

---

## 11. Routes

| Route | Roles | Description |
|-------|-------|-------------|
| `/workspace` | all | My Tasks — global assigned view |
| `/workspace/folders` | all | Browse folders (filtered by membership) |
| `/workspace/folders/[folderId]` | folder members | Folder view with list/kanban/gantt/calendar |
| `/workspace/folders/[folderId]/lists/[listId]` | folder members | List view with all 4 views |
| `/workspace/tasks/[taskId]` | folder members | Task detail page |
| `/timesheet` | all | Timesheet with tabs |
| `/settings/workspace` | admin | Checklist + list templates |
| `/settings/timesheet` | admin | Timesheet settings + approval config |

---

## 12. Navigation

**Sidebar additions:**
- "Workspace" (LayoutGrid icon) — before Attendance
- "Timesheet" (ClipboardList icon) — after Payroll

**Settings nav additions:**
- "Workspace" tab — template management
- "Timesheet" tab — timesheet settings

---

## 13. Implementation Cycles

Given the size, recommended split:

**Cycle 1: Core Workspace**
- Database migrations (all tables)
- Types, routes, navigation
- Folders CRUD + permissions
- Lists CRUD
- Tasks CRUD + subtasks
- Remarks, attachments, checklists
- List view + Kanban view
- My Tasks view
- Notifications system (bell + in-app)
- Templates (checklist + list)

**Cycle 2: Advanced Features**
- Gantt view
- Calendar view
- Status approval workflow
- Recurring tasks
- Email notifications
- Time logging on tasks
- Timesheet page + weekly grid
- Timesheet submission + approval
- Monday reminder cron
- Timesheet settings
