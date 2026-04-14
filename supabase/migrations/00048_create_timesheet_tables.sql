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
