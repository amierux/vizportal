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
