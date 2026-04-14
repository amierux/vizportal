# Workspace Cycle 2: Advanced Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Gantt and Calendar views, status approval workflow, recurring tasks, time logging on tasks, full timesheet module with weekly submission/approval flow, and Monday reminder cron.

**Architecture:** Status approvals use workspace_task_approvals/steps tables (new migrations). Recurring tasks auto-create on completion. Time entries link tasks to timesheet. Timesheet has its own submission/approval chain separate from the main approval engine. Monday cron sends compliance reports.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth), Tailwind + shadcn/ui, Zod, Vitest, Resend

**Spec:** `docs/superpowers/specs/2026-04-14-workspace-timesheet-design.md` — Sections 3.3-3.4, 6, 7, 9.3, 10, 2.13-2.14, 2.17-2.23

---

## File Structure

```
vizportal/
├── supabase/migrations/
│   ├── 00046_create_workspace_approvals.sql
│   ├── 00047_create_workspace_time_entries.sql
│   ├── 00048_create_timesheet_tables.sql
│   └── 00049_seed_timesheet_defaults.sql
├── src/
│   ├── app/(portal)/
│   │   ├── timesheet/page.tsx                         # Timesheet with tabs
│   │   └── settings/timesheet/page.tsx                # Timesheet settings
│   ├── app/api/cron/
│   │   ├── timesheet-reminder/route.ts                # Monday reminder
│   │   └── task-due-reminder/route.ts                 # Daily task due reminder
│   ├── components/
│   │   ├── workspace/
│   │   │   ├── task-gantt-view.tsx                    # Gantt chart
│   │   │   ├── task-calendar-view.tsx                 # Calendar view
│   │   │   ├── task-time-log.tsx                      # Log time on task
│   │   │   ├── task-status-approval.tsx               # Status approval UI
│   │   │   └── view-switcher.tsx                      # MODIFY — enable Gantt + Calendar
│   │   └── timesheet/
│   │       ├── timesheet-weekly-grid.tsx              # Weekly grid
│   │       ├── timesheet-submission.tsx               # Submit + status
│   │       └── timesheet-all-members.tsx              # Admin view
│   │   └── settings/
│   │       └── timesheet-settings-form.tsx            # Settings form
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── workspace-tasks.ts                     # MODIFY — status approval + recurring
│   │   │   ├── workspace-time-entries.ts              # Time entry CRUD
│   │   │   ├── timesheet.ts                           # Submission + approval
│   │   │   └── timesheet-settings.ts                  # Settings CRUD
│   │   └── validations/
│   │       └── timesheet.ts                           # Schemas
│   └── types/
│       ├── database.ts                                # MODIFY — 6 new tables
│       └── index.ts                                   # MODIFY
```

---

## Task 1: Database Migrations

**Files:**
- Create: 4 migration files

- [ ] **Step 1: Create migration 00046 — workspace task approvals**

Create `vizportal/supabase/migrations/00046_create_workspace_approvals.sql`:

```sql
-- Status approval config per status
CREATE TABLE workspace_status_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id UUID NOT NULL,
  approval_mode TEXT CHECK (approval_mode IN ('hierarchical', 'any_one')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_status_approvers_status ON workspace_status_approvers(status_id);

ALTER TABLE workspace_status_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status approvers"
  ON workspace_status_approvers FOR SELECT USING (true);

CREATE POLICY "Admin can manage status approvers"
  ON workspace_status_approvers FOR ALL USING (has_role('admin'));

-- Individual approvers for a status
CREATE TABLE workspace_status_approver_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_approver_id UUID REFERENCES workspace_status_approvers(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  step_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE workspace_status_approver_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approver list"
  ON workspace_status_approver_list FOR SELECT USING (true);

CREATE POLICY "Admin can manage approver list"
  ON workspace_status_approver_list FOR ALL USING (has_role('admin'));

-- Task approval requests
CREATE TABLE workspace_task_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  from_status_id UUID NOT NULL,
  to_status_id UUID NOT NULL,
  requested_by UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_task_approvals_task ON workspace_task_approvals(task_id);

ALTER TABLE workspace_task_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task approvals"
  ON workspace_task_approvals FOR SELECT
  USING (task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id()));

CREATE POLICY "Members can create task approvals"
  ON workspace_task_approvals FOR INSERT
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "System can update task approvals"
  ON workspace_task_approvals FOR UPDATE
  USING (task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id()));

-- Individual approval steps
CREATE TABLE workspace_task_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_approval_id UUID REFERENCES workspace_task_approvals(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES profiles(id) NOT NULL,
  step_order INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_approval_steps_approval ON workspace_task_approval_steps(task_approval_id);
CREATE INDEX idx_workspace_approval_steps_approver ON workspace_task_approval_steps(approver_id);

ALTER TABLE workspace_task_approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval steps"
  ON workspace_task_approval_steps FOR SELECT
  USING (
    task_approval_id IN (
      SELECT id FROM workspace_task_approvals
      WHERE task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
    )
  );

CREATE POLICY "Approvers can update own steps"
  ON workspace_task_approval_steps FOR UPDATE
  USING (approver_id = auth.uid() AND status = 'pending');
```

- [ ] **Step 2: Create migration 00047 — time entries**

Create `vizportal/supabase/migrations/00047_create_workspace_time_entries.sql`:

```sql
CREATE TABLE workspace_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  is_billable BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_time_entries_task ON workspace_time_entries(task_id);
CREATE INDEX idx_workspace_time_entries_profile ON workspace_time_entries(profile_id);
CREATE INDEX idx_workspace_time_entries_date ON workspace_time_entries(profile_id, date);

ALTER TABLE workspace_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entries"
  ON workspace_time_entries FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can view all time entries"
  ON workspace_time_entries FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr', 'business_manager', 'director']));

CREATE POLICY "TL/DM can view dept time entries"
  ON workspace_time_entries FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['team_leader', 'dept_manager'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can insert own time entries"
  ON workspace_time_entries FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Users can update own time entries"
  ON workspace_time_entries FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own time entries"
  ON workspace_time_entries FOR DELETE
  USING (profile_id = auth.uid());
```

- [ ] **Step 3: Create migration 00048 — timesheet tables**

Create `vizportal/supabase/migrations/00048_create_timesheet_tables.sql`:

```sql
CREATE TABLE timesheet_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) UNIQUE NOT NULL,
  reminder_email_addresses TEXT[] DEFAULT '{}' NOT NULL,
  submission_deadline_day TEXT DEFAULT 'monday' NOT NULL,
  is_approval_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER timesheet_settings_updated_at
  BEFORE UPDATE ON timesheet_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE timesheet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view timesheet settings"
  ON timesheet_settings FOR SELECT
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can manage timesheet settings"
  ON timesheet_settings FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE TABLE timesheet_approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER timesheet_approval_configs_updated_at
  BEFORE UPDATE ON timesheet_approval_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE timesheet_approval_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view timesheet approval configs"
  ON timesheet_approval_configs FOR SELECT
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can manage timesheet approval configs"
  ON timesheet_approval_configs FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE TABLE timesheet_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_approval_config_id UUID REFERENCES timesheet_approval_configs(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE timesheet_approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view timesheet approval steps"
  ON timesheet_approval_steps FOR SELECT
  USING (
    timesheet_approval_config_id IN (
      SELECT id FROM timesheet_approval_configs WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "Admin can manage timesheet approval steps"
  ON timesheet_approval_steps FOR ALL
  USING (
    timesheet_approval_config_id IN (
      SELECT id FROM timesheet_approval_configs WHERE company_id = get_user_company_id()
    )
    AND has_role('admin')
  );

CREATE TABLE timesheet_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0 NOT NULL,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft' NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(profile_id, week_start_date)
);

CREATE INDEX idx_timesheet_submissions_profile ON timesheet_submissions(profile_id);

CREATE TRIGGER timesheet_submissions_updated_at
  BEFORE UPDATE ON timesheet_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE timesheet_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions"
  ON timesheet_submissions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR/BM/Director can view all submissions"
  ON timesheet_submissions FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr', 'business_manager', 'director']));

CREATE POLICY "TL/DM can view dept submissions"
  ON timesheet_submissions FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['team_leader', 'dept_manager'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can manage own submissions"
  ON timesheet_submissions FOR ALL
  USING (profile_id = auth.uid());
```

- [ ] **Step 4: Create migration 00049 — seed timesheet defaults**

Create `vizportal/supabase/migrations/00049_seed_timesheet_defaults.sql`:

```sql
CREATE OR REPLACE FUNCTION seed_company_timesheet_defaults(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_config_id UUID;
BEGIN
  INSERT INTO timesheet_settings (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  INSERT INTO timesheet_approval_configs (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING
  RETURNING id INTO v_config_id;

  IF v_config_id IS NOT NULL THEN
    INSERT INTO timesheet_approval_steps (timesheet_approval_config_id, step_order, role, is_optional) VALUES
      (v_config_id, 1, 'team_leader', false);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 5: Push migrations + seed + commit**

```bash
npx supabase db push
npx supabase db query --linked "SELECT seed_company_timesheet_defaults('a0000000-0000-4000-8000-000000000001');"
git add supabase/migrations/
git commit -m "feat: add Cycle 2 migrations — workspace approvals, time entries, timesheet"
```

---

## Task 2: Types + Routes + Navigation

**Files:**
- Modify: `vizportal/src/types/database.ts` — add 10 new table types
- Modify: `vizportal/src/types/index.ts` — add aliases
- Modify: `vizportal/src/lib/constants.ts` — add routes
- Modify: `vizportal/src/components/layout/header.tsx` — add titles
- Modify: `vizportal/src/components/layout/sidebar.tsx` — add Timesheet
- Modify: `vizportal/src/components/settings/settings-nav.tsx` — add Timesheet tab

New table types: `workspace_status_approvers`, `workspace_status_approver_list`, `workspace_task_approvals`, `workspace_task_approval_steps`, `workspace_time_entries`, `timesheet_settings`, `timesheet_approval_configs`, `timesheet_approval_steps`, `timesheet_submissions`.

Routes: `/timesheet`, `/settings/timesheet`.
Sidebar: "Timesheet" with `ClipboardList` icon after Payroll.
Settings nav: "Timesheet" tab.

- [ ] **Step 1: Add all types, routes, navigation**
- [ ] **Step 2: Verify build + commit**

---

## Task 3: Time Entry Actions + Task Time Log Component

**Files:**
- Create: `vizportal/src/lib/actions/workspace-time-entries.ts`
- Create: `vizportal/src/components/workspace/task-time-log.tsx`

Actions:
- `logTime(_prevState, formData)` — task_id, date, duration (with unit conversion), description, is_billable
- `getTaskTimeEntries(taskId)` — entries for a task
- `getMyTimeEntries(startDate, endDate)` — current user's entries for a date range
- `updateTimeEntry(entryId, data)` — edit
- `deleteTimeEntry(entryId)` — delete
- `searchMyTasks(query)` — search tasks assigned to user by name (for timesheet autocomplete)

Component: "Log Time" section on task detail — form with date, duration input (number + unit select: minutes/hours/days), description, billable toggle. List of existing time entries with edit/delete.

- [ ] **Step 1: Create actions + component**
- [ ] **Step 2: Add time log to task detail panel**
- [ ] **Step 3: Verify build + commit**

---

## Task 4: Status Approval Workflow

**Files:**
- Modify: `vizportal/src/lib/actions/workspace-tasks.ts` — update `updateTaskStatus` for approval
- Create: `vizportal/src/components/workspace/task-status-approval.tsx`

Update `updateTaskStatus`: when target status has `requires_approval = true`, instead of directly changing status, create a `workspace_task_approvals` record + steps from `workspace_status_approvers`/`workspace_status_approver_list`. Send notifications to approvers.

New functions:
- `processTaskApproval(stepId, decision, comment)` — approve/reject. If hierarchical, advance chain. Append to remarks. On full approval, change task status. On rejection, revert.
- `getPendingTaskApprovals(taskId)` — for display

Component: Shows pending approval status on task, approve/reject buttons for approvers.

- [ ] **Step 1: Update task status logic + create approval component**
- [ ] **Step 2: Verify build + commit**

---

## Task 5: Recurring Tasks

**Files:**
- Modify: `vizportal/src/lib/actions/workspace-tasks.ts` — add recurring logic

When a task with `is_recurring = true` has its status changed to one with `is_done = true`:
1. Create new task copy (same name, description, assignee, priority, list)
2. Status = first status (lowest position, is_done = false)
3. Shift dates by recurrence_rule interval
4. If carry_over_checklist: copy unchecked checklist items
5. If carry_over_subtasks: copy incomplete subtasks
6. Original stays as completed historical record

New action: `handleRecurringTaskCompletion(taskId)` — called from `updateTaskStatus` when task is marked done and is_recurring.

- [ ] **Step 1: Implement recurring logic**
- [ ] **Step 2: Verify build + commit**

---

## Task 6: Gantt View + Calendar View

**Files:**
- Create: `vizportal/src/components/workspace/task-gantt-view.tsx`
- Create: `vizportal/src/components/workspace/task-calendar-view.tsx`
- Modify: `vizportal/src/components/workspace/view-switcher.tsx` — enable Gantt + Calendar

Gantt: horizontal timeline with bars per task (start → end). Color by status. CSS-based (no external library). Scrollable. Shows task name on left, bar on right.

Calendar: month view showing tasks on their target_end_date. Color by priority. Click date shows tasks due. Same pattern as attendance-calendar.

View switcher: remove "(Coming soon)" badges from Gantt and Calendar tabs.

- [ ] **Step 1: Create gantt + calendar components**
- [ ] **Step 2: Update view switcher**
- [ ] **Step 3: Verify build + commit**

---

## Task 7: Timesheet Actions + Validation

**Files:**
- Create: `vizportal/src/lib/validations/timesheet.ts`
- Create: `vizportal/src/lib/actions/timesheet.ts`
- Create: `vizportal/src/lib/actions/timesheet-settings.ts`

Timesheet actions:
- `getWeeklyTimesheet(weekStartDate)` — time entries grouped by task for a week
- `submitTimesheet(weekStartDate)` — create/update submission record, trigger approval if enabled
- `getMyTimesheetSubmissions()` — list of submissions with status
- `getAllTimesheetSubmissions(filters)` — admin view with filters
- `approveTimesheet(submissionId, comment)` — approve submission
- `rejectTimesheet(submissionId, comment)` — reject submission

Settings actions:
- `getTimesheetSettings()` — get settings
- `updateTimesheetSettings(_prevState, formData)` — update settings + approval steps

Validation: `timesheetSettingsSchema`, `timeEntrySchema`

- [ ] **Step 1: Create all 3 files**
- [ ] **Step 2: Verify build + commit**

---

## Task 8: Timesheet UI Components

**Files:**
- Create: `vizportal/src/components/timesheet/timesheet-weekly-grid.tsx`
- Create: `vizportal/src/components/timesheet/timesheet-submission.tsx`
- Create: `vizportal/src/components/timesheet/timesheet-all-members.tsx`
- Create: `vizportal/src/components/settings/timesheet-settings-form.tsx`

Weekly grid: rows = tasks, columns = Mon-Sun + Total. Cells = hours (click to add/edit). Add row via task search autocomplete. Submit button.

Submission: status badge, resubmit if rejected.

All members: admin table with filters + export.

Settings form: reminder emails, deadline day, approval toggle + chain editor.

- [ ] **Step 1: Create all 4 components**
- [ ] **Step 2: Verify build + commit**

---

## Task 9: Timesheet Page + Settings Page

**Files:**
- Create: `vizportal/src/app/(portal)/timesheet/page.tsx`
- Create: `vizportal/src/app/(portal)/settings/timesheet/page.tsx`

Timesheet page: My Timesheet tab (weekly grid + submit) + All Members tab (admin). Process same as attendance/leave records tabs.

Settings page: timesheet settings form.

- [ ] **Step 1: Create both pages**
- [ ] **Step 2: Verify build + commit**

---

## Task 10: Cron Jobs

**Files:**
- Create: `vizportal/src/app/api/cron/timesheet-reminder/route.ts`
- Create: `vizportal/src/app/api/cron/task-due-reminder/route.ts`
- Modify: `vizportal/vercel.json` — add cron schedules

Timesheet reminder (Monday 9AM): query members with no submission for last week, send report to configured emails, send individual reminders.

Task due reminder (daily 9AM): query tasks where target_end_date = tomorrow, send notification to assignees.

vercel.json: add both cron schedules.

- [ ] **Step 1: Create both cron routes**
- [ ] **Step 2: Update vercel.json**
- [ ] **Step 3: Verify build + commit**

---

## Task 11: Final Integration + Deploy

- [ ] **Step 1: Full verification**
```bash
npm test && npm run build && npm run lint
```

- [ ] **Step 2: Push migrations + seed**
```bash
npx supabase db push
npx supabase db query --linked "SELECT seed_company_timesheet_defaults('a0000000-0000-4000-8000-000000000001');"
```

- [ ] **Step 3: Deploy**
```bash
npx vercel --prod --yes
```
