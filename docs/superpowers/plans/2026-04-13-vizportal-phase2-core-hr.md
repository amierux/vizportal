# VizPortal Phase 2: Core HR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add attendance tracking (clock-in/out with selfie + GPS), leave & vacation management, and a generic approval engine to VizPortal.

**Architecture:** Generic approval engine built first as shared infrastructure. Attendance and leave modules both plug into it. Email notifications via Resend. Selfie compression client-side. All times displayed in SGT (Asia/Singapore). Cron jobs for reminders, absence marking, and annual leave reset.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth, Storage, Edge Functions), Tailwind + shadcn/ui, Zod, Vitest, Resend (email), recharts (charts), browser-image-compression (selfie)

**Spec:** `docs/superpowers/specs/2026-04-13-vizportal-phase2-core-hr-design.md`

---

## File Structure

```
vizportal/
├── supabase/
│   └── migrations/
│       ├── 00013_create_employee_schedules.sql
│       ├── 00014_create_clock_entries.sql
│       ├── 00015_create_daily_attendance_summary.sql
│       ├── 00016_create_leave_types.sql
│       ├── 00017_create_leave_settings.sql
│       ├── 00018_create_leave_balances.sql
│       ├── 00019_create_leave_requests.sql
│       ├── 00020_create_approval_requests.sql
│       ├── 00021_create_approval_steps.sql
│       ├── 00022_enable_phase2_rls.sql
│       ├── 00023_create_phase2_storage.sql
│       └── 00024_seed_leave_types.sql
├── src/
│   ├── app/
│   │   ├── (portal)/
│   │   │   ├── attendance/
│   │   │   │   ├── page.tsx                    # My Attendance (clock, history)
│   │   │   │   ├── team/page.tsx               # Team attendance (TL/DM)
│   │   │   │   ├── manage/page.tsx             # Attendance management (HR/Admin)
│   │   │   │   └── reports/page.tsx            # Attendance reports + export
│   │   │   ├── leave/
│   │   │   │   ├── page.tsx                    # My Leave (balances, requests)
│   │   │   │   ├── team/page.tsx               # Team leave calendar (TL/DM)
│   │   │   │   ├── manage/page.tsx             # Leave management (HR/Admin)
│   │   │   │   └── settings/page.tsx           # Leave types + reset config
│   │   │   └── approvals/
│   │   │       └── page.tsx                    # My Approvals inbox
│   │   ├── approvals/
│   │   │   └── [token]/page.tsx                # Public approval link page
│   │   └── api/
│   │       ├── email/send/route.ts             # Email sending API route
│   │       └── cron/
│   │           ├── approval-reminders/route.ts # 3-day reminder cron
│   │           ├── mark-absences/route.ts      # Daily absence marking
│   │           └── leave-reset/route.ts        # Annual leave balance reset
│   ├── components/
│   │   ├── attendance/
│   │   │   ├── live-clock.tsx                  # SGT clock display
│   │   │   ├── clock-button.tsx                # Clock in/out with selfie/GPS
│   │   │   ├── today-sessions.tsx              # Today's in/out sessions list
│   │   │   ├── attendance-calendar.tsx         # Monthly color-coded calendar
│   │   │   ├── attendance-table.tsx            # Admin attendance list
│   │   │   ├── attendance-summary-table.tsx    # Monthly summary metrics
│   │   │   ├── manual-clock-dialog.tsx         # File manual clock request
│   │   │   └── schedule-form.tsx               # Employee schedule setup
│   │   ├── leave/
│   │   │   ├── balance-cards.tsx               # Leave balance display
│   │   │   ├── leave-request-form.tsx          # File leave request
│   │   │   ├── leave-requests-table.tsx        # Leave requests list
│   │   │   ├── leave-calendar.tsx              # Team leave calendar
│   │   │   ├── leave-type-table.tsx            # Leave types CRUD
│   │   │   ├── leave-settings-form.tsx         # Reset date config
│   │   │   └── balance-adjustment-dialog.tsx   # Manual balance edit
│   │   └── approvals/
│   │       ├── approval-inbox.tsx              # My pending approvals list
│   │       ├── approval-detail.tsx             # Request detail + decide
│   │       └── approval-public-page.tsx        # Token-auth approval page
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── attendance.ts                   # Clock, summary, schedule actions
│   │   │   ├── leave.ts                        # Leave requests, balances actions
│   │   │   ├── leave-types.ts                  # Leave type CRUD actions
│   │   │   ├── leave-settings.ts               # Leave settings actions
│   │   │   └── approvals.ts                    # Approval engine actions
│   │   ├── validations/
│   │   │   ├── attendance.ts                   # Clock, schedule schemas
│   │   │   └── leave.ts                        # Leave request, type schemas
│   │   └── utils/
│   │       ├── attendance.ts                   # Summary calculation helpers
│   │       └── email.ts                        # Email sending utility
│   └── types/
│       ├── database.ts                         # Updated with 9 new tables
│       └── index.ts                            # Updated with new type aliases
├── __tests__/
│   └── lib/
│       ├── validations/
│       │   ├── attendance.test.ts
│       │   └── leave.test.ts
│       └── utils/
│           └── attendance.test.ts
```

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `vizportal/package.json`

- [ ] **Step 1: Install production dependencies**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npm install resend recharts browser-image-compression
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend, recharts, browser-image-compression for Phase 2"
```

---

## Task 2: Database Migrations

**Files:**
- Create: `vizportal/supabase/migrations/00013_create_employee_schedules.sql`
- Create: `vizportal/supabase/migrations/00014_create_clock_entries.sql`
- Create: `vizportal/supabase/migrations/00015_create_daily_attendance_summary.sql`
- Create: `vizportal/supabase/migrations/00016_create_leave_types.sql`
- Create: `vizportal/supabase/migrations/00017_create_leave_settings.sql`
- Create: `vizportal/supabase/migrations/00018_create_leave_balances.sql`
- Create: `vizportal/supabase/migrations/00019_create_leave_requests.sql`
- Create: `vizportal/supabase/migrations/00020_create_approval_requests.sql`
- Create: `vizportal/supabase/migrations/00021_create_approval_steps.sql`
- Create: `vizportal/supabase/migrations/00022_enable_phase2_rls.sql`
- Create: `vizportal/supabase/migrations/00023_create_phase2_storage.sql`
- Create: `vizportal/supabase/migrations/00024_seed_leave_types.sql`

- [ ] **Step 1: Create migration 00013 — employee_schedules**

Create `vizportal/supabase/migrations/00013_create_employee_schedules.sql`:

```sql
CREATE TABLE employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  work_type TEXT CHECK (work_type IN ('full_time', 'part_time')) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  work_days TEXT[] NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_employee_schedules_company_id ON employee_schedules(company_id);

CREATE TRIGGER employee_schedules_updated_at
  BEFORE UPDATE ON employee_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Create migration 00014 — clock_entries**

Create `vizportal/supabase/migrations/00014_create_clock_entries.sql`:

```sql
CREATE TABLE clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('clock_in', 'clock_out')) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  selfie_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  is_manual BOOLEAN DEFAULT false NOT NULL,
  manual_remarks TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_clock_entries_company_id ON clock_entries(company_id);
CREATE INDEX idx_clock_entries_profile_id ON clock_entries(profile_id);
CREATE INDEX idx_clock_entries_profile_date ON clock_entries(profile_id, date);
```

- [ ] **Step 3: Create migration 00015 — daily_attendance_summary**

Create `vizportal/supabase/migrations/00015_create_daily_attendance_summary.sql`:

```sql
CREATE TABLE daily_attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  date DATE NOT NULL,
  total_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  required_hours DECIMAL(5,2) NOT NULL,
  is_late BOOLEAN DEFAULT false NOT NULL,
  late_minutes INTEGER DEFAULT 0 NOT NULL,
  is_early_out BOOLEAN DEFAULT false NOT NULL,
  early_out_minutes INTEGER DEFAULT 0 NOT NULL,
  is_undertime BOOLEAN DEFAULT false NOT NULL,
  undertime_minutes INTEGER DEFAULT 0 NOT NULL,
  overtime_minutes INTEGER DEFAULT 0 NOT NULL,
  has_missing_entry BOOLEAN DEFAULT false NOT NULL,
  status TEXT CHECK (status IN ('present', 'late', 'absent', 'half_day', 'on_leave')) DEFAULT 'absent' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(profile_id, date)
);

CREATE INDEX idx_daily_attendance_summary_company_id ON daily_attendance_summary(company_id);
CREATE INDEX idx_daily_attendance_summary_profile_date ON daily_attendance_summary(profile_id, date);

CREATE TRIGGER daily_attendance_summary_updated_at
  BEFORE UPDATE ON daily_attendance_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 4: Create migration 00016 — leave_types**

Create `vizportal/supabase/migrations/00016_create_leave_types.sql`:

```sql
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  default_days DECIMAL(5,1) NOT NULL,
  is_paid BOOLEAN DEFAULT true NOT NULL,
  applicable_gender TEXT CHECK (applicable_gender IN ('all', 'male', 'female')) DEFAULT 'all' NOT NULL,
  requires_attachment BOOLEAN DEFAULT false NOT NULL,
  is_carry_over BOOLEAN DEFAULT false NOT NULL,
  max_carry_over_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE INDEX idx_leave_types_company_id ON leave_types(company_id);

CREATE TRIGGER leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 5: Create migration 00017 — leave_settings**

Create `vizportal/supabase/migrations/00017_create_leave_settings.sql`:

```sql
CREATE TABLE leave_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) UNIQUE NOT NULL,
  reset_month INTEGER CHECK (reset_month BETWEEN 1 AND 12) DEFAULT 1 NOT NULL,
  reset_day INTEGER CHECK (reset_day BETWEEN 1 AND 31) DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER leave_settings_updated_at
  BEFORE UPDATE ON leave_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 6: Create migration 00018 — leave_balances**

Create `vizportal/supabase/migrations/00018_create_leave_balances.sql`:

```sql
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  year INTEGER NOT NULL,
  total_days DECIMAL(5,1) NOT NULL,
  used_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  remaining_days DECIMAL(5,1) NOT NULL,
  carried_over_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(profile_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_company_id ON leave_balances(company_id);
CREATE INDEX idx_leave_balances_profile_id ON leave_balances(profile_id);

CREATE TRIGGER leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 7: Create migration 00019 — leave_requests**

Create `vizportal/supabase/migrations/00019_create_leave_requests.sql`:

```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,1) NOT NULL,
  reason TEXT,
  attachment_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_profile_id ON leave_requests(profile_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(profile_id, start_date, end_date);

CREATE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 8: Create migration 00020 — approval_requests**

Create `vizportal/supabase/migrations/00020_create_approval_requests.sql`:

```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending' NOT NULL,
  current_step INTEGER DEFAULT 1 NOT NULL,
  total_steps INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_approval_requests_company_id ON approval_requests(company_id);
CREATE INDEX idx_approval_requests_requester_id ON approval_requests(requester_id);
CREATE INDEX idx_approval_requests_type_ref ON approval_requests(type, reference_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);

CREATE TRIGGER approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 9: Create migration 00021 — approval_steps**

Create `vizportal/supabase/migrations/00021_create_approval_steps.sql`:

```sql
CREATE TABLE approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  approver_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_approval_steps_request_id ON approval_steps(approval_request_id);
CREATE INDEX idx_approval_steps_approver_id ON approval_steps(approver_id);
CREATE INDEX idx_approval_steps_token ON approval_steps(token);
```

- [ ] **Step 10: Create migration 00022 — Phase 2 RLS policies**

Create `vizportal/supabase/migrations/00022_enable_phase2_rls.sql`:

```sql
-- ============================================================
-- ENABLE RLS ON ALL PHASE 2 TABLES
-- ============================================================
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EMPLOYEE_SCHEDULES
-- ============================================================
CREATE POLICY "Admin/HR can view all schedules"
  ON employee_schedules FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "TL/DM can view own dept schedules"
  ON employee_schedules FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can view own schedule"
  ON employee_schedules FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can manage schedules"
  ON employee_schedules FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- CLOCK_ENTRIES
-- ============================================================
CREATE POLICY "Admin/HR can view all clock entries"
  ON clock_entries FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "TL/DM can view own dept clock entries"
  ON clock_entries FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can view own clock entries"
  ON clock_entries FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own clock entries"
  ON clock_entries FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Admin/HR can update clock entries"
  ON clock_entries FOR UPDATE
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Admin/HR can delete clock entries"
  ON clock_entries FOR DELETE
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- DAILY_ATTENDANCE_SUMMARY
-- ============================================================
CREATE POLICY "Admin/HR can view all summaries"
  ON daily_attendance_summary FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "TL/DM can view own dept summaries"
  ON daily_attendance_summary FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can view own summary"
  ON daily_attendance_summary FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "System can manage summaries"
  ON daily_attendance_summary FOR ALL
  USING (company_id = get_user_company_id());

-- ============================================================
-- LEAVE_TYPES
-- ============================================================
CREATE POLICY "Users can view active leave types"
  ON leave_types FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage leave types"
  ON leave_types FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

-- ============================================================
-- LEAVE_SETTINGS
-- ============================================================
CREATE POLICY "Admin can view leave settings"
  ON leave_settings FOR SELECT
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can manage leave settings"
  ON leave_settings FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

-- ============================================================
-- LEAVE_BALANCES
-- ============================================================
CREATE POLICY "Admin/HR can view all balances"
  ON leave_balances FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can view own balances"
  ON leave_balances FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can manage balances"
  ON leave_balances FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- LEAVE_REQUESTS
-- ============================================================
CREATE POLICY "Admin/HR can view all leave requests"
  ON leave_requests FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "TL/DM can view own dept leave requests"
  ON leave_requests FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can view own leave requests"
  ON leave_requests FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Users can update own pending leave requests"
  ON leave_requests FOR UPDATE
  USING (profile_id = auth.uid() AND status = 'pending')
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin/HR can update leave requests"
  ON leave_requests FOR UPDATE
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- APPROVAL_REQUESTS
-- ============================================================
CREATE POLICY "Admin/HR can view all approval requests"
  ON approval_requests FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can view own approval requests"
  ON approval_requests FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Approvers can view assigned approval requests"
  ON approval_requests FOR SELECT
  USING (
    id IN (
      SELECT approval_request_id FROM approval_steps
      WHERE approver_id = auth.uid()
    )
  );

CREATE POLICY "System can manage approval requests"
  ON approval_requests FOR ALL
  USING (company_id = get_user_company_id());

-- ============================================================
-- APPROVAL_STEPS
-- ============================================================
CREATE POLICY "Admin/HR can view all approval steps"
  ON approval_steps FOR SELECT
  USING (
    approval_request_id IN (
      SELECT id FROM approval_requests
      WHERE company_id = get_user_company_id()
    )
    AND has_any_role(ARRAY['admin', 'hr'])
  );

CREATE POLICY "Approvers can view own steps"
  ON approval_steps FOR SELECT
  USING (approver_id = auth.uid());

CREATE POLICY "Requesters can view own request steps"
  ON approval_steps FOR SELECT
  USING (
    approval_request_id IN (
      SELECT id FROM approval_requests
      WHERE requester_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can update own pending steps"
  ON approval_steps FOR UPDATE
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (approver_id = auth.uid());

CREATE POLICY "System can manage approval steps"
  ON approval_steps FOR ALL
  USING (
    approval_request_id IN (
      SELECT id FROM approval_requests
      WHERE company_id = get_user_company_id()
    )
  );
```

- [ ] **Step 11: Create migration 00023 — Phase 2 storage policies**

Create `vizportal/supabase/migrations/00023_create_phase2_storage.sql`:

```sql
-- Users can upload attendance selfies to their own folder
CREATE POLICY "Users can upload attendance selfies"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND (storage.foldername(name))[2] = 'attendance'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );

-- Users can upload leave attachments to their own folder
CREATE POLICY "Users can upload leave attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vizportal-storage'
    AND (storage.foldername(name))[1] = get_user_company_id()::text
    AND (storage.foldername(name))[2] = 'leave'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );
```

- [ ] **Step 12: Create migration 00024 — seed leave types function**

Create `vizportal/supabase/migrations/00024_seed_leave_types.sql`:

```sql
-- Extend the seed function to include default leave types and settings
CREATE OR REPLACE FUNCTION seed_company_leave_defaults(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Default PH statutory leave types
  INSERT INTO leave_types (company_id, name, code, default_days, is_paid, applicable_gender, requires_attachment, is_carry_over, max_carry_over_days) VALUES
    (p_company_id, 'Vacation Leave', 'VL', 5, true, 'all', false, true, 5),
    (p_company_id, 'Sick Leave', 'SL', 5, true, 'all', false, false, 0),
    (p_company_id, 'Maternity Leave', 'ML', 105, true, 'female', true, false, 0),
    (p_company_id, 'Paternity Leave', 'PL', 7, true, 'male', false, false, 0),
    (p_company_id, 'Solo Parent Leave', 'SPL', 7, true, 'all', false, false, 0),
    (p_company_id, 'VAWC Leave', 'VAWC', 10, true, 'female', true, false, 0),
    (p_company_id, 'Special Leave for Women', 'SLW', 60, true, 'female', true, false, 0);

  -- Default leave settings (reset Jan 1)
  INSERT INTO leave_settings (company_id, reset_month, reset_day)
  VALUES (p_company_id, 1, 1)
  ON CONFLICT (company_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 13: Commit migrations**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
git add supabase/migrations/
git commit -m "feat: add Phase 2 database migrations — schedules, attendance, leave, approvals"
```

---

## Task 3: Update Database Types

**Files:**
- Modify: `vizportal/src/types/database.ts`
- Modify: `vizportal/src/types/index.ts`

- [ ] **Step 1: Add 9 new table types to database.ts**

Add the following table definitions inside `Database["public"]["Tables"]` in `src/types/database.ts` (after the existing `invitations` table):

```typescript
      employee_schedules: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          work_type: "full_time" | "part_time";
          start_time: string;
          end_time: string;
          work_days: string[];
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          work_type: "full_time" | "part_time";
          start_time: string;
          end_time: string;
          work_days: string[];
          timezone?: string;
        };
        Update: {
          work_type?: "full_time" | "part_time";
          start_time?: string;
          end_time?: string;
          work_days?: string[];
          timezone?: string;
        };
        Relationships: [];
      };
      clock_entries: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          type: "clock_in" | "clock_out";
          timestamp: string;
          selfie_url: string | null;
          latitude: number | null;
          longitude: number | null;
          is_manual: boolean;
          manual_remarks: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          type: "clock_in" | "clock_out";
          timestamp: string;
          selfie_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_manual?: boolean;
          manual_remarks?: string | null;
          date: string;
        };
        Update: {
          is_manual?: boolean;
          manual_remarks?: string | null;
        };
        Relationships: [];
      };
      daily_attendance_summary: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          date: string;
          total_hours: number;
          required_hours: number;
          is_late: boolean;
          late_minutes: number;
          is_early_out: boolean;
          early_out_minutes: number;
          is_undertime: boolean;
          undertime_minutes: number;
          overtime_minutes: number;
          has_missing_entry: boolean;
          status: "present" | "late" | "absent" | "half_day" | "on_leave";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          date: string;
          total_hours?: number;
          required_hours: number;
          is_late?: boolean;
          late_minutes?: number;
          is_early_out?: boolean;
          early_out_minutes?: number;
          is_undertime?: boolean;
          undertime_minutes?: number;
          overtime_minutes?: number;
          has_missing_entry?: boolean;
          status?: "present" | "late" | "absent" | "half_day" | "on_leave";
        };
        Update: {
          total_hours?: number;
          required_hours?: number;
          is_late?: boolean;
          late_minutes?: number;
          is_early_out?: boolean;
          early_out_minutes?: number;
          is_undertime?: boolean;
          undertime_minutes?: number;
          overtime_minutes?: number;
          has_missing_entry?: boolean;
          status?: "present" | "late" | "absent" | "half_day" | "on_leave";
        };
        Relationships: [];
      };
      leave_types: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          code: string;
          default_days: number;
          is_paid: boolean;
          applicable_gender: "all" | "male" | "female";
          requires_attachment: boolean;
          is_carry_over: boolean;
          max_carry_over_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          code: string;
          default_days: number;
          is_paid?: boolean;
          applicable_gender?: "all" | "male" | "female";
          requires_attachment?: boolean;
          is_carry_over?: boolean;
          max_carry_over_days?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          code?: string;
          default_days?: number;
          is_paid?: boolean;
          applicable_gender?: "all" | "male" | "female";
          requires_attachment?: boolean;
          is_carry_over?: boolean;
          max_carry_over_days?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      leave_settings: {
        Row: {
          id: string;
          company_id: string;
          reset_month: number;
          reset_day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          reset_month?: number;
          reset_day?: number;
        };
        Update: {
          reset_month?: number;
          reset_day?: number;
        };
        Relationships: [];
      };
      leave_balances: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          leave_type_id: string;
          year: number;
          total_days: number;
          used_days: number;
          remaining_days: number;
          carried_over_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          leave_type_id: string;
          year: number;
          total_days: number;
          used_days?: number;
          remaining_days: number;
          carried_over_days?: number;
        };
        Update: {
          total_days?: number;
          used_days?: number;
          remaining_days?: number;
          carried_over_days?: number;
        };
        Relationships: [];
      };
      leave_requests: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
          reason: string | null;
          attachment_url: string | null;
          status: "pending" | "approved" | "rejected" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
          reason?: string | null;
          attachment_url?: string | null;
          status?: "pending" | "approved" | "rejected" | "cancelled";
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "cancelled";
          reason?: string | null;
          attachment_url?: string | null;
        };
        Relationships: [];
      };
      approval_requests: {
        Row: {
          id: string;
          company_id: string;
          type: string;
          reference_id: string;
          requester_id: string;
          status: "pending" | "approved" | "rejected" | "cancelled";
          current_step: number;
          total_steps: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: string;
          reference_id: string;
          requester_id: string;
          status?: "pending" | "approved" | "rejected" | "cancelled";
          current_step?: number;
          total_steps: number;
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "cancelled";
          current_step?: number;
        };
        Relationships: [];
      };
      approval_steps: {
        Row: {
          id: string;
          approval_request_id: string;
          step_order: number;
          approver_id: string;
          status: "pending" | "approved" | "rejected";
          comment: string | null;
          decided_at: string | null;
          email_sent_at: string | null;
          reminder_sent_at: string | null;
          token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          approval_request_id: string;
          step_order: number;
          approver_id: string;
          status?: "pending" | "approved" | "rejected";
          comment?: string | null;
          token?: string;
        };
        Update: {
          status?: "pending" | "approved" | "rejected";
          comment?: string | null;
          decided_at?: string | null;
          email_sent_at?: string | null;
          reminder_sent_at?: string | null;
        };
        Relationships: [];
      };
```

- [ ] **Step 2: Add new type aliases to index.ts**

Add to `src/types/index.ts`:

```typescript
export type EmployeeSchedule = Database["public"]["Tables"]["employee_schedules"]["Row"];
export type ClockEntry = Database["public"]["Tables"]["clock_entries"]["Row"];
export type DailyAttendanceSummary = Database["public"]["Tables"]["daily_attendance_summary"]["Row"];
export type LeaveType = Database["public"]["Tables"]["leave_types"]["Row"];
export type LeaveSettings = Database["public"]["Tables"]["leave_settings"]["Row"];
export type LeaveBalance = Database["public"]["Tables"]["leave_balances"]["Row"];
export type LeaveRequest = Database["public"]["Tables"]["leave_requests"]["Row"];
export type ApprovalRequest = Database["public"]["Tables"]["approval_requests"]["Row"];
export type ApprovalStep = Database["public"]["Tables"]["approval_steps"]["Row"];

export type ApprovalType = "manual_clock" | "leave_request";
export type AttendanceStatus = "present" | "late" | "absent" | "half_day" | "on_leave";
export type WorkType = "full_time" | "part_time";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalStepStatus = "pending" | "approved" | "rejected";
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/types/
git commit -m "feat: add Phase 2 database types — schedules, attendance, leave, approvals"
```

---

## Task 4: Constants, Validators, and Utilities

**Files:**
- Modify: `vizportal/src/lib/constants.ts`
- Create: `vizportal/src/lib/validations/attendance.ts`
- Create: `vizportal/src/lib/validations/leave.ts`
- Create: `vizportal/src/lib/utils/attendance.ts`
- Create: `vizportal/src/lib/utils/email.ts`
- Test: `vizportal/__tests__/lib/validations/attendance.test.ts`
- Test: `vizportal/__tests__/lib/validations/leave.test.ts`
- Test: `vizportal/__tests__/lib/utils/attendance.test.ts`

- [ ] **Step 1: Update constants.ts with Phase 2 additions**

Add the following to `src/lib/constants.ts`:

```typescript
// Phase 2 — Attendance
export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
] as const;

export const WORK_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
] as const;

export const WORK_DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
] as const;

export const CLOCK_ENTRY_TYPES = [
  { value: "clock_in", label: "Clock In" },
  { value: "clock_out", label: "Clock Out" },
] as const;

export const SGT_TIMEZONE = "Asia/Singapore";
export const LATE_GRACE_MINUTES = 1;
export const CROSS_MIDNIGHT_THRESHOLD_HOURS = 4;
export const SELFIE_MAX_SIZE_KB = 100;
export const SELFIE_QUALITY = 0.4;
export const APPROVAL_REMINDER_DAYS = 3;

// Phase 2 — Leave
export const LEAVE_GENDER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "male", label: "Male Only" },
  { value: "female", label: "Female Only" },
] as const;

export const LEAVE_REQUEST_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const ATTENDANCE_PER_PAGE = 25;
```

Add to the existing `ROUTE_ROLE_MAP`:

```typescript
  "/attendance": [],
  "/attendance/team": ["dept_manager", "team_leader"],
  "/attendance/manage": ["admin", "hr"],
  "/attendance/reports": ["admin", "hr"],
  "/leave": [],
  "/leave/team": ["dept_manager", "team_leader"],
  "/leave/manage": ["admin", "hr"],
  "/leave/settings": ["admin"],
  "/approvals": [],
```

- [ ] **Step 2: Create attendance validation schemas**

Create `vizportal/src/lib/validations/attendance.ts`:

```typescript
import { z } from "zod";

export const scheduleSchema = z.object({
  work_type: z.enum(["full_time", "part_time"]),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  work_days: z.array(z.string()).min(1, "At least one work day is required"),
  timezone: z.string().default("Asia/Singapore"),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const manualClockSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum(["clock_in", "clock_out"]),
  time: z.string().min(1, "Time is required"),
  reason: z.string().min(1, "Reason is required"),
});

export type ManualClockInput = z.infer<typeof manualClockSchema>;
```

- [ ] **Step 3: Create leave validation schemas**

Create `vizportal/src/lib/validations/leave.ts`:

```typescript
import { z } from "zod";

export const leaveTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  default_days: z.number().min(0, "Days must be 0 or greater"),
  is_paid: z.boolean().default(true),
  applicable_gender: z.enum(["all", "male", "female"]).default("all"),
  requires_attachment: z.boolean().default(false),
  is_carry_over: z.boolean().default(false),
  max_carry_over_days: z.number().min(0).default(0),
});

export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;

export const leaveSettingsSchema = z.object({
  reset_month: z.number().int().min(1).max(12),
  reset_day: z.number().int().min(1).max(31),
});

export type LeaveSettingsInput = z.infer<typeof leaveSettingsSchema>;

export const leaveRequestSchema = z.object({
  leave_type_id: z.string().uuid("Please select a leave type"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
});

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const balanceAdjustmentSchema = z.object({
  total_days: z.number().min(0, "Days must be 0 or greater"),
  used_days: z.number().min(0, "Used days must be 0 or greater"),
});

export type BalanceAdjustmentInput = z.infer<typeof balanceAdjustmentSchema>;
```

- [ ] **Step 4: Create attendance utility helpers**

Create `vizportal/src/lib/utils/attendance.ts`:

```typescript
import { SGT_TIMEZONE, LATE_GRACE_MINUTES, CROSS_MIDNIGHT_THRESHOLD_HOURS } from "@/lib/constants";
import type { ClockEntry } from "@/types";

/**
 * Determine the work date for a clock entry.
 * If the entry is within CROSS_MIDNIGHT_THRESHOLD_HOURS after midnight,
 * it belongs to the previous calendar day.
 */
export function getWorkDate(timestamp: string): string {
  const date = new Date(timestamp);
  const sgtDate = new Date(date.toLocaleString("en-US", { timeZone: SGT_TIMEZONE }));
  const hours = sgtDate.getHours();

  if (hours < CROSS_MIDNIGHT_THRESHOLD_HOURS) {
    sgtDate.setDate(sgtDate.getDate() - 1);
  }

  return sgtDate.toISOString().split("T")[0];
}

/**
 * Calculate total worked hours from paired clock entries for a given date.
 * Returns hours as a decimal (e.g., 8.5 for 8 hours 30 minutes).
 */
export function calculateTotalHours(entries: ClockEntry[]): number {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalMs = 0;
  let clockInTime: Date | null = null;

  for (const entry of sorted) {
    if (entry.type === "clock_in") {
      clockInTime = new Date(entry.timestamp);
    } else if (entry.type === "clock_out" && clockInTime) {
      totalMs += new Date(entry.timestamp).getTime() - clockInTime.getTime();
      clockInTime = null;
    }
  }

  return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Check if the first clock-in is late based on schedule start time.
 * Returns { isLate, lateMinutes }.
 */
export function checkLateness(
  firstClockIn: string,
  scheduleStartTime: string,
  workDate: string,
  timezone: string = SGT_TIMEZONE
): { isLate: boolean; lateMinutes: number } {
  const clockInDate = new Date(firstClockIn);
  const clockInSgt = new Date(clockInDate.toLocaleString("en-US", { timeZone: timezone }));

  const [startHour, startMin] = scheduleStartTime.split(":").map(Number);
  const scheduledStart = new Date(clockInSgt);
  scheduledStart.setHours(startHour, startMin, 0, 0);

  // Check if workDate matches — handle cross-midnight
  const diffMs = clockInSgt.getTime() - scheduledStart.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes > LATE_GRACE_MINUTES) {
    return { isLate: true, lateMinutes: diffMinutes };
  }

  return { isLate: false, lateMinutes: 0 };
}

/**
 * Check if the last clock-out is before schedule end time.
 * Returns { isEarlyOut, earlyOutMinutes }.
 */
export function checkEarlyOut(
  lastClockOut: string,
  scheduleEndTime: string,
  timezone: string = SGT_TIMEZONE
): { isEarlyOut: boolean; earlyOutMinutes: number } {
  const clockOutDate = new Date(lastClockOut);
  const clockOutSgt = new Date(clockOutDate.toLocaleString("en-US", { timeZone: timezone }));

  const [endHour, endMin] = scheduleEndTime.split(":").map(Number);
  const scheduledEnd = new Date(clockOutSgt);
  scheduledEnd.setHours(endHour, endMin, 0, 0);

  // If scheduled end is before the clock-out date's midnight and clock is after midnight,
  // the scheduled end is on the previous day — skip this check
  const diffMs = scheduledEnd.getTime() - clockOutSgt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes > 0) {
    return { isEarlyOut: true, earlyOutMinutes: diffMinutes };
  }

  return { isEarlyOut: false, earlyOutMinutes: 0 };
}

/**
 * Calculate the number of work days between two dates based on employee's work_days schedule.
 * Used for leave day calculation.
 */
export function countWorkDays(
  startDate: string,
  endDate: string,
  workDays: string[]
): number {
  const dayMap: Record<number, string> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
  };

  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  const current = new Date(start);
  while (current <= end) {
    const dayName = dayMap[current.getDay()];
    if (workDays.includes(dayName)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Format time for SGT display.
 */
export function formatTimeSGT(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-SG", {
    timeZone: SGT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Get current SGT date string (YYYY-MM-DD).
 */
export function getCurrentDateSGT(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SGT_TIMEZONE });
}

/**
 * Get current SGT day name (lowercase: 'mon', 'tue', etc.)
 */
export function getCurrentDaySGT(): string {
  const dayMap: Record<number, string> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
  };
  const now = new Date();
  const sgtDay = new Date(now.toLocaleString("en-US", { timeZone: SGT_TIMEZONE }));
  return dayMap[sgtDay.getDay()];
}
```

- [ ] **Step 5: Create email utility**

Create `vizportal/src/lib/utils/email.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: "VizPortal <noreply@vizserve.com>",
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

export function buildApprovalEmail(params: {
  requesterName: string;
  type: string;
  details: string;
  approvalUrl: string;
}): { subject: string; html: string } {
  const typeLabel = params.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";

  return {
    subject: `[VizPortal] Approval needed: ${typeLabel} from ${params.requesterName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Approval Required</h2>
        <p><strong>${params.requesterName}</strong> submitted a <strong>${typeLabel}</strong>.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${params.details}
        </div>
        <a href="${params.approvalUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Review & Decide
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          This link will take you to a page where you can approve or reject this request.
        </p>
      </div>
    `,
  };
}

export function buildStatusEmail(params: {
  recipientName: string;
  type: string;
  status: "approved" | "rejected";
  approverName: string;
  comment?: string | null;
}): { subject: string; html: string } {
  const typeLabel = params.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";
  const statusLabel = params.status === "approved" ? "Approved" : "Rejected";
  const statusColor = params.status === "approved" ? "#22c55e" : "#ef4444";

  return {
    subject: `[VizPortal] Your ${typeLabel} was ${statusLabel.toLowerCase()} by ${params.approverName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Request ${statusLabel}</h2>
        <p>Hi ${params.recipientName},</p>
        <p>Your <strong>${typeLabel}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${statusLabel.toLowerCase()}</span> by <strong>${params.approverName}</strong>.</p>
        ${params.comment ? `<p><em>Comment: "${params.comment}"</em></p>` : ""}
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Log in to VizPortal to view details.
        </p>
      </div>
    `,
  };
}

export function buildReminderEmail(params: {
  approverName: string;
  requesterName: string;
  type: string;
  approvalUrl: string;
  daysPending: number;
}): { subject: string; html: string } {
  const typeLabel = params.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";

  return {
    subject: `[VizPortal] Reminder: Pending approval for ${typeLabel} from ${params.requesterName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pending Approval Reminder</h2>
        <p>Hi ${params.approverName},</p>
        <p>You have a pending ${typeLabel} from <strong>${params.requesterName}</strong> that has been waiting for <strong>${params.daysPending} days</strong>.</p>
        <a href="${params.approvalUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Review & Decide
        </a>
      </div>
    `,
  };
}
```

- [ ] **Step 6: Write validation tests**

Create `vizportal/__tests__/lib/validations/attendance.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { scheduleSchema, manualClockSchema } from "@/lib/validations/attendance";

describe("scheduleSchema", () => {
  it("accepts valid full-time schedule", () => {
    const result = scheduleSchema.safeParse({
      work_type: "full_time",
      start_time: "08:00",
      end_time: "17:00",
      work_days: ["mon", "tue", "wed", "thu", "fri"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid part-time schedule", () => {
    const result = scheduleSchema.safeParse({
      work_type: "part_time",
      start_time: "09:00",
      end_time: "13:00",
      work_days: ["mon", "wed", "fri"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty work_days", () => {
    const result = scheduleSchema.safeParse({
      work_type: "full_time",
      start_time: "08:00",
      end_time: "17:00",
      work_days: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid work_type", () => {
    const result = scheduleSchema.safeParse({
      work_type: "contractor",
      start_time: "08:00",
      end_time: "17:00",
      work_days: ["mon"],
    });
    expect(result.success).toBe(false);
  });
});

describe("manualClockSchema", () => {
  it("accepts valid manual clock entry", () => {
    const result = manualClockSchema.safeParse({
      date: "2026-04-13",
      type: "clock_in",
      time: "08:00",
      reason: "Forgot to clock in",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing reason", () => {
    const result = manualClockSchema.safeParse({
      date: "2026-04-13",
      type: "clock_in",
      time: "08:00",
      reason: "",
    });
    expect(result.success).toBe(false);
  });
});
```

Create `vizportal/__tests__/lib/validations/leave.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  leaveTypeSchema,
  leaveRequestSchema,
  leaveSettingsSchema,
  balanceAdjustmentSchema,
} from "@/lib/validations/leave";

describe("leaveTypeSchema", () => {
  it("accepts valid leave type", () => {
    const result = leaveTypeSchema.safeParse({
      name: "Vacation Leave",
      code: "VL",
      default_days: 5,
      is_paid: true,
      applicable_gender: "all",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = leaveTypeSchema.safeParse({
      name: "Test",
      code: "",
      default_days: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative days", () => {
    const result = leaveTypeSchema.safeParse({
      name: "Test",
      code: "T",
      default_days: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("leaveRequestSchema", () => {
  it("accepts valid leave request", () => {
    const result = leaveRequestSchema.safeParse({
      leave_type_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      start_date: "2026-04-14",
      end_date: "2026-04-16",
      reason: "Family vacation",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing start_date", () => {
    const result = leaveRequestSchema.safeParse({
      leave_type_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      start_date: "",
      end_date: "2026-04-16",
    });
    expect(result.success).toBe(false);
  });
});

describe("leaveSettingsSchema", () => {
  it("accepts valid settings", () => {
    const result = leaveSettingsSchema.safeParse({ reset_month: 1, reset_day: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects month > 12", () => {
    const result = leaveSettingsSchema.safeParse({ reset_month: 13, reset_day: 1 });
    expect(result.success).toBe(false);
  });
});

describe("balanceAdjustmentSchema", () => {
  it("accepts valid adjustment", () => {
    const result = balanceAdjustmentSchema.safeParse({ total_days: 10, used_days: 3 });
    expect(result.success).toBe(true);
  });

  it("rejects negative used_days", () => {
    const result = balanceAdjustmentSchema.safeParse({ total_days: 10, used_days: -1 });
    expect(result.success).toBe(false);
  });
});
```

Create `vizportal/__tests__/lib/utils/attendance.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateTotalHours,
  countWorkDays,
  checkLateness,
} from "@/lib/utils/attendance";
import type { ClockEntry } from "@/types";

const makeEntry = (type: "clock_in" | "clock_out", timestamp: string): ClockEntry => ({
  id: "test",
  company_id: "test",
  profile_id: "test",
  type,
  timestamp,
  selfie_url: null,
  latitude: null,
  longitude: null,
  is_manual: false,
  manual_remarks: null,
  date: "2026-04-13",
  created_at: timestamp,
});

describe("calculateTotalHours", () => {
  it("calculates single session correctly", () => {
    const entries = [
      makeEntry("clock_in", "2026-04-13T08:00:00+08:00"),
      makeEntry("clock_out", "2026-04-13T17:00:00+08:00"),
    ];
    expect(calculateTotalHours(entries)).toBe(9);
  });

  it("calculates multiple sessions correctly", () => {
    const entries = [
      makeEntry("clock_in", "2026-04-13T08:00:00+08:00"),
      makeEntry("clock_out", "2026-04-13T12:00:00+08:00"),
      makeEntry("clock_in", "2026-04-13T13:00:00+08:00"),
      makeEntry("clock_out", "2026-04-13T17:00:00+08:00"),
    ];
    expect(calculateTotalHours(entries)).toBe(8);
  });

  it("handles unpaired clock-in (missing clock-out)", () => {
    const entries = [
      makeEntry("clock_in", "2026-04-13T08:00:00+08:00"),
    ];
    expect(calculateTotalHours(entries)).toBe(0);
  });
});

describe("countWorkDays", () => {
  it("counts Mon-Fri correctly for one week", () => {
    const result = countWorkDays("2026-04-13", "2026-04-17", ["mon", "tue", "wed", "thu", "fri"]);
    expect(result).toBe(5);
  });

  it("excludes weekends", () => {
    const result = countWorkDays("2026-04-13", "2026-04-19", ["mon", "tue", "wed", "thu", "fri"]);
    expect(result).toBe(5);
  });

  it("counts only specified days", () => {
    const result = countWorkDays("2026-04-13", "2026-04-19", ["mon", "wed", "fri"]);
    expect(result).toBe(3);
  });

  it("single day returns 1 if work day", () => {
    const result = countWorkDays("2026-04-14", "2026-04-14", ["mon", "tue"]);
    expect(result).toBe(1);
  });
});

describe("checkLateness", () => {
  it("detects lateness correctly", () => {
    const result = checkLateness(
      "2026-04-13T08:15:00+08:00",
      "08:00",
      "2026-04-13",
      "Asia/Singapore"
    );
    expect(result.isLate).toBe(true);
    expect(result.lateMinutes).toBe(15);
  });

  it("allows on-time with grace period", () => {
    const result = checkLateness(
      "2026-04-13T08:01:00+08:00",
      "08:00",
      "2026-04-13",
      "Asia/Singapore"
    );
    expect(result.isLate).toBe(false);
  });
});
```

- [ ] **Step 7: Run tests**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npm test
```

Expected: All tests pass (existing 22 + new tests).

- [ ] **Step 8: Verify build**

```bash
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/constants.ts src/lib/validations/ src/lib/utils/ __tests__/
git commit -m "feat: add Phase 2 constants, validation schemas, attendance utils, and email helper"
```

---

## Task 5: Approval Engine Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/approvals.ts`

This is the core approval engine — used by both attendance and leave modules.

- [ ] **Step 1: Create approval server actions**

Create `vizportal/src/lib/actions/approvals.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, buildApprovalEmail, buildStatusEmail } from "@/lib/utils/email";
import { formatFullName } from "@/lib/utils/format";

type ActionState = { error: string } | { success: true } | null;

/**
 * Create an approval request with TL → DM chain.
 * Determines approvers from requester's department.
 */
export async function createApprovalRequest(params: {
  companyId: string;
  type: "manual_clock" | "leave_request";
  referenceId: string;
  requesterId: string;
  details: string;
}) {
  const supabase = await createClient();

  // Get requester's department info
  const { data: empDetail } = await supabase
    .from("employee_details")
    .select("department_id")
    .eq("profile_id", params.requesterId)
    .single();

  let teamLeaderId: string | null = null;
  let managerId: string | null = null;

  if (empDetail?.department_id) {
    const { data: dept } = await supabase
      .from("departments")
      .select("team_leader_id, manager_id")
      .eq("id", empDetail.department_id)
      .single();

    teamLeaderId = dept?.team_leader_id ?? null;
    managerId = dept?.manager_id ?? null;
  }

  // Build approver list (skip nulls, skip if approver is the requester)
  const approvers: string[] = [];
  if (teamLeaderId && teamLeaderId !== params.requesterId) approvers.push(teamLeaderId);
  if (managerId && managerId !== params.requesterId) approvers.push(managerId);

  // Fallback: if no approvers found, route to any HR user
  if (approvers.length === 0) {
    const { data: hrUsers } = await supabase
      .from("user_roles")
      .select("profile_id, roles(name)")
      .eq("roles.name", "hr");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hrProfileIds = (hrUsers ?? [])
      .filter((ur: any) => ur.roles?.name === "hr" && ur.profile_id !== params.requesterId)
      .map((ur: any) => ur.profile_id);

    if (hrProfileIds.length > 0) {
      approvers.push(hrProfileIds[0]);
    }
  }

  if (approvers.length === 0) {
    return { error: "No approvers found. Please contact your administrator." };
  }

  const totalSteps = approvers.length;

  // Create approval request
  const { data: request, error: reqError } = await supabase
    .from("approval_requests")
    .insert({
      company_id: params.companyId,
      type: params.type,
      reference_id: params.referenceId,
      requester_id: params.requesterId,
      total_steps: totalSteps,
    })
    .select("id")
    .single();

  if (reqError || !request) return { error: "Failed to create approval request" };

  // Create approval steps
  for (let i = 0; i < approvers.length; i++) {
    await supabase.from("approval_steps").insert({
      approval_request_id: request.id,
      step_order: i + 1,
      approver_id: approvers[i],
    });
  }

  // Get requester name for email
  const { data: requester } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", params.requesterId)
    .single();

  const requesterName = requester
    ? formatFullName(requester.first_name, requester.last_name)
    : "Unknown";

  // Send email to first approver
  const { data: firstStep } = await supabase
    .from("approval_steps")
    .select("id, token, approver_id")
    .eq("approval_request_id", request.id)
    .eq("step_order", 1)
    .single();

  if (firstStep) {
    const { data: approver } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", firstStep.approver_id)
      .single();

    if (approver?.email) {
      const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://vizportal.vercel.app"}/approvals/${firstStep.token}`;
      const email = buildApprovalEmail({
        requesterName,
        type: params.type,
        details: params.details,
        approvalUrl,
      });

      await sendEmail({ to: approver.email, ...email });

      await supabase
        .from("approval_steps")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", firstStep.id);
    }
  }

  return { success: true, approvalRequestId: request.id };
}

/**
 * Process an approval decision (approve or reject) for a given step.
 */
export async function processApprovalDecision(
  token: string,
  decision: "approved" | "rejected",
  comment: string | null
) {
  const supabase = await createClient();

  // Find the step by token
  const { data: step } = await supabase
    .from("approval_steps")
    .select("*, approval_requests(*)")
    .eq("token", token)
    .single();

  if (!step) return { error: "Approval not found" };
  if (step.status !== "pending") return { error: "This approval has already been decided" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = step.approval_requests as any;

  // Update the step
  await supabase
    .from("approval_steps")
    .update({
      status: decision,
      comment,
      decided_at: new Date().toISOString(),
    })
    .eq("id", step.id);

  // Get names for emails
  const { data: approver } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", step.approver_id)
    .single();

  const approverName = approver
    ? formatFullName(approver.first_name, approver.last_name)
    : "Unknown";

  const { data: requester } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", request.requester_id)
    .single();

  const requesterName = requester
    ? formatFullName(requester.first_name, requester.last_name)
    : "Unknown";

  if (decision === "rejected") {
    // Reject entire request
    await supabase
      .from("approval_requests")
      .update({ status: "rejected" })
      .eq("id", request.id);

    // Apply rejection side effects
    await applyRejectionSideEffects(supabase, request.type, request.reference_id);

    // Notify requester
    if (requester?.email) {
      const email = buildStatusEmail({
        recipientName: requesterName,
        type: request.type,
        status: "rejected",
        approverName,
        comment,
      });
      await sendEmail({ to: requester.email, ...email });
    }
  } else if (decision === "approved") {
    if (step.step_order < request.total_steps) {
      // Advance to next step
      await supabase
        .from("approval_requests")
        .update({ current_step: step.step_order + 1 })
        .eq("id", request.id);

      // Notify requester of partial approval
      if (requester?.email) {
        const email = buildStatusEmail({
          recipientName: requesterName,
          type: request.type,
          status: "approved",
          approverName,
          comment,
        });
        await sendEmail({ to: requester.email, ...email });
      }

      // Send email to next approver
      const { data: nextStep } = await supabase
        .from("approval_steps")
        .select("id, token, approver_id")
        .eq("approval_request_id", request.id)
        .eq("step_order", step.step_order + 1)
        .single();

      if (nextStep) {
        const { data: nextApprover } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", nextStep.approver_id)
          .single();

        if (nextApprover?.email) {
          const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://vizportal.vercel.app"}/approvals/${nextStep.token}`;
          const emailContent = buildApprovalEmail({
            requesterName,
            type: request.type,
            details: `Approved by ${approverName} (Step ${step.step_order}/${request.total_steps})`,
            approvalUrl,
          });
          await sendEmail({ to: nextApprover.email, ...emailContent });

          await supabase
            .from("approval_steps")
            .update({ email_sent_at: new Date().toISOString() })
            .eq("id", nextStep.id);
        }
      }
    } else {
      // Final approval — mark request as approved
      await supabase
        .from("approval_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      // Apply approval side effects
      await applyApprovalSideEffects(supabase, request.type, request.reference_id);

      // Notify requester
      if (requester?.email) {
        const email = buildStatusEmail({
          recipientName: requesterName,
          type: request.type,
          status: "approved",
          approverName,
          comment,
        });
        await sendEmail({ to: requester.email, ...email });
      }
    }
  }

  revalidatePath("/approvals");
  return { success: true };
}

/**
 * Apply side effects when an approval request is fully approved.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyApprovalSideEffects(supabase: any, type: string, referenceId: string) {
  if (type === "manual_clock") {
    // Mark clock entry as approved manual
    await supabase
      .from("clock_entries")
      .update({ manual_remarks: "Manual entry (approved)" })
      .eq("id", referenceId);

    // Recalculate daily summary would be triggered by the attendance module
  } else if (type === "leave_request") {
    // Update leave request status
    await supabase
      .from("leave_requests")
      .update({ status: "approved" })
      .eq("id", referenceId);

    // Get leave request details for balance update
    const { data: leaveReq } = await supabase
      .from("leave_requests")
      .select("profile_id, leave_type_id, total_days, start_date")
      .eq("id", referenceId)
      .single();

    if (leaveReq) {
      const year = new Date(leaveReq.start_date).getFullYear();

      // Update leave balance
      const { data: balance } = await supabase
        .from("leave_balances")
        .select("id, used_days, remaining_days")
        .eq("profile_id", leaveReq.profile_id)
        .eq("leave_type_id", leaveReq.leave_type_id)
        .eq("year", year)
        .single();

      if (balance) {
        await supabase
          .from("leave_balances")
          .update({
            used_days: balance.used_days + leaveReq.total_days,
            remaining_days: balance.remaining_days - leaveReq.total_days,
          })
          .eq("id", balance.id);
      }
    }
  }
}

/**
 * Apply side effects when an approval request is rejected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyRejectionSideEffects(supabase: any, type: string, referenceId: string) {
  if (type === "manual_clock") {
    // Delete the manual clock entry
    await supabase
      .from("clock_entries")
      .delete()
      .eq("id", referenceId);
  } else if (type === "leave_request") {
    // Update leave request status
    await supabase
      .from("leave_requests")
      .update({ status: "rejected" })
      .eq("id", referenceId);
  }
}

/**
 * Cancel an approval request (by requester).
 */
export async function cancelApprovalRequest(approvalRequestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", approvalRequestId)
    .eq("requester_id", user.id)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found or cannot be cancelled" };

  // Cancel the request
  await supabase
    .from("approval_requests")
    .update({ status: "cancelled" })
    .eq("id", approvalRequestId);

  // Cancel all pending steps
  await supabase
    .from("approval_steps")
    .update({ status: "rejected" })
    .eq("approval_request_id", approvalRequestId)
    .eq("status", "pending");

  // Apply cancellation side effects
  if (request.type === "manual_clock") {
    await supabase.from("clock_entries").delete().eq("id", request.reference_id);
  } else if (request.type === "leave_request") {
    await supabase
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", request.reference_id);
  }

  revalidatePath("/approvals");
  return { success: true };
}

/**
 * Get pending approvals for the current user.
 */
export async function getMyPendingApprovals() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: steps } = await supabase
    .from("approval_steps")
    .select(`
      *,
      approval_requests(
        id, type, reference_id, requester_id, status, current_step, total_steps, created_at,
        requester:profiles!approval_requests_requester_id_fkey(first_name, last_name, email)
      )
    `)
    .eq("approver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Filter to only show steps where it's their turn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (steps ?? []).filter((step: any) => {
    const req = step.approval_requests;
    return req && req.status === "pending" && req.current_step === step.step_order;
  });
}

/**
 * Get approval request details by token (for public approval page).
 */
export async function getApprovalByToken(token: string) {
  const supabase = await createClient();

  const { data: step } = await supabase
    .from("approval_steps")
    .select(`
      *,
      approval_requests(
        id, type, reference_id, requester_id, status, current_step, total_steps, created_at,
        requester:profiles!approval_requests_requester_id_fkey(first_name, last_name, email)
      )
    `)
    .eq("token", token)
    .single();

  if (!step) return null;

  // Fetch reference details based on type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = step.approval_requests as any;
  let referenceDetails = null;

  if (request?.type === "manual_clock") {
    const { data } = await supabase
      .from("clock_entries")
      .select("*")
      .eq("id", request.reference_id)
      .single();
    referenceDetails = data;
  } else if (request?.type === "leave_request") {
    const { data } = await supabase
      .from("leave_requests")
      .select("*, leave_types(name, code)")
      .eq("id", request.reference_id)
      .single();
    referenceDetails = data;
  }

  return { step, referenceDetails };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/approvals.ts
git commit -m "feat: add generic approval engine — create, process, cancel, query"
```

---

## Task 6: Approval Pages

**Files:**
- Create: `vizportal/src/app/approvals/[token]/page.tsx` — Public token-auth approval page
- Create: `vizportal/src/components/approvals/approval-public-page.tsx` — Public approval UI
- Create: `vizportal/src/app/(portal)/approvals/page.tsx` — My Approvals inbox
- Create: `vizportal/src/components/approvals/approval-inbox.tsx` — Inbox list component

Full code for all approval page components. The public approval page (`/approvals/[token]`) is outside the `(portal)` layout since it doesn't require login — the token IS the authentication.

The My Approvals inbox (`/(portal)/approvals`) is inside the portal layout and shows all pending approvals for the logged-in user.

*Complete code for these files will be provided in the task prompt to the implementing subagent, following the exact patterns from Phase 1 (server pages, client components, useActionState, toast notifications).*

---

## Task 7: Attendance Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/attendance.ts`

Server actions for clock-in/out, manual clock requests, schedule management, and summary recalculation.

*Complete code will follow the exact server action pattern from Phase 1: `_prevState` signature, Zod validation, company-scoped queries, revalidatePath.*

---

## Task 8: Attendance UI Components

**Files:**
- Create: `vizportal/src/components/attendance/live-clock.tsx`
- Create: `vizportal/src/components/attendance/clock-button.tsx`
- Create: `vizportal/src/components/attendance/today-sessions.tsx`
- Create: `vizportal/src/components/attendance/attendance-calendar.tsx`
- Create: `vizportal/src/components/attendance/manual-clock-dialog.tsx`
- Create: `vizportal/src/components/attendance/schedule-form.tsx`
- Create: `vizportal/src/components/attendance/attendance-table.tsx`
- Create: `vizportal/src/components/attendance/attendance-summary-table.tsx`

All attendance UI components. Live clock uses `setInterval` for real-time SGT display. Clock button handles selfie capture via `navigator.mediaDevices.getUserMedia()`, compression via `browser-image-compression`, and GPS via `navigator.geolocation`.

---

## Task 9: Attendance Pages

**Files:**
- Create: `vizportal/src/app/(portal)/attendance/page.tsx` — My Attendance
- Create: `vizportal/src/app/(portal)/attendance/team/page.tsx` — Team Attendance
- Create: `vizportal/src/app/(portal)/attendance/manage/page.tsx` — Management
- Create: `vizportal/src/app/(portal)/attendance/reports/page.tsx` — Reports + Export

---

## Task 10: Leave Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/leave.ts`
- Create: `vizportal/src/lib/actions/leave-types.ts`
- Create: `vizportal/src/lib/actions/leave-settings.ts`

Leave request filing, balance management, leave type CRUD, settings management.

---

## Task 11: Leave UI Components

**Files:**
- Create: `vizportal/src/components/leave/balance-cards.tsx`
- Create: `vizportal/src/components/leave/leave-request-form.tsx`
- Create: `vizportal/src/components/leave/leave-requests-table.tsx`
- Create: `vizportal/src/components/leave/leave-calendar.tsx`
- Create: `vizportal/src/components/leave/leave-type-table.tsx`
- Create: `vizportal/src/components/leave/leave-settings-form.tsx`
- Create: `vizportal/src/components/leave/balance-adjustment-dialog.tsx`

---

## Task 12: Leave Pages

**Files:**
- Create: `vizportal/src/app/(portal)/leave/page.tsx` — My Leave
- Create: `vizportal/src/app/(portal)/leave/team/page.tsx` — Team Leave
- Create: `vizportal/src/app/(portal)/leave/manage/page.tsx` — Management
- Create: `vizportal/src/app/(portal)/leave/settings/page.tsx` — Settings

---

## Task 13: Navigation & Layout Updates

**Files:**
- Modify: `vizportal/src/components/layout/sidebar.tsx` — Add Attendance, Leave, Approvals nav items
- Modify: `vizportal/src/components/layout/bottom-tabs.tsx` — Add mobile tabs
- Modify: `vizportal/src/components/layout/header.tsx` — Add page titles
- Modify: `vizportal/src/proxy.ts` — Add `/approvals/` to public routes for token-auth pages

---

## Task 14: Cron Job API Routes

**Files:**
- Create: `vizportal/src/app/api/cron/approval-reminders/route.ts`
- Create: `vizportal/src/app/api/cron/mark-absences/route.ts`
- Create: `vizportal/src/app/api/cron/leave-reset/route.ts`
- Create: `vizportal/src/app/api/email/send/route.ts`

API routes triggered by Vercel Cron or external scheduler. Each validates a `CRON_SECRET` header for security.

---

## Task 15: Seed Leave Types for Existing Company

Run the seed function for the existing VizServe company to create default leave types and settings.

```bash
export SUPABASE_ACCESS_TOKEN="..." 
npx supabase db query --linked "SELECT seed_company_leave_defaults('a0000000-0000-4000-8000-000000000001');"
```

---

## Task 16: Final Integration & Tests

- Run all tests
- Full build check
- Lint check
- Fix any issues
- Final commit
- Deploy to Vercel
