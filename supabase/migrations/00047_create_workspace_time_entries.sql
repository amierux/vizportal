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
