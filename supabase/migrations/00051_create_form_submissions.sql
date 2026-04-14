CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  submitted_by UUID REFERENCES profiles(id),
  respondent_name TEXT,
  respondent_email TEXT,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'submitted' NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  saved_to_list BOOLEAN DEFAULT false NOT NULL,
  workspace_task_id UUID REFERENCES workspace_tasks(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_user ON form_submissions(submitted_by);

CREATE TRIGGER form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can view all submissions"
  ON form_submissions FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can view own submissions"
  ON form_submissions FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can insert submissions"
  ON form_submissions FOR INSERT
  WITH CHECK (company_id = get_user_company_id() OR submitted_by IS NULL);

CREATE POLICY "Admin can manage submissions"
  ON form_submissions FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE TABLE form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX idx_form_assignments_form ON form_assignments(form_id);
CREATE INDEX idx_form_assignments_profile ON form_assignments(profile_id);

ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments"
  ON form_assignments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin can view all assignments"
  ON form_assignments FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Admin can manage assignments"
  ON form_assignments FOR ALL
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_role('admin'));
