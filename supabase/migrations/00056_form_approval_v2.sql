-- Form Approval v2: hierarchical/any_one mode with specific user approvers
-- Drops old role-based steps table, introduces user-based approvers + per-submission approval tracking

-- Add approval_mode to form_approval_configs
ALTER TABLE form_approval_configs ADD COLUMN IF NOT EXISTS approval_mode TEXT CHECK (approval_mode IN ('hierarchical', 'any_one')) DEFAULT 'hierarchical' NOT NULL;

-- Drop the old role-based steps table
DROP TABLE IF EXISTS form_approval_steps CASCADE;

-- New: specific user approvers per form
CREATE TABLE IF NOT EXISTS form_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_approval_config_id UUID REFERENCES form_approval_configs(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  step_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_approvers_config ON form_approvers(form_approval_config_id);

ALTER TABLE form_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form approvers"
  ON form_approvers FOR SELECT
  USING (
    form_approval_config_id IN (
      SELECT id FROM form_approval_configs WHERE form_id IN (
        SELECT id FROM forms WHERE company_id = get_user_company_id()
      )
    )
  );

CREATE POLICY "Form creators can manage form approvers"
  ON form_approvers FOR ALL
  USING (
    form_approval_config_id IN (
      SELECT fac.id FROM form_approval_configs fac
      JOIN forms f ON f.id = fac.form_id
      WHERE f.company_id = get_user_company_id()
      AND (f.created_by = auth.uid() OR has_role('admin'))
    )
  );

-- Table to track actual approval requests per submission
CREATE TABLE IF NOT EXISTS form_submission_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES form_submissions(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
  approval_mode TEXT CHECK (approval_mode IN ('hierarchical', 'any_one')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_submission_approvals_submission ON form_submission_approvals(submission_id);

ALTER TABLE form_submission_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submission approvals"
  ON form_submission_approvals FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM form_submissions WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "System can manage submission approvals"
  ON form_submission_approvals FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM form_submissions WHERE company_id = get_user_company_id()
    )
  );

-- Individual approval steps (one per approver)
CREATE TABLE IF NOT EXISTS form_submission_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_approval_id UUID REFERENCES form_submission_approvals(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES profiles(id) NOT NULL,
  step_order INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_submission_approval_steps_approval ON form_submission_approval_steps(submission_approval_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_approval_steps_approver ON form_submission_approval_steps(approver_id);

ALTER TABLE form_submission_approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval steps"
  ON form_submission_approval_steps FOR SELECT
  USING (
    submission_approval_id IN (
      SELECT fsa.id FROM form_submission_approvals fsa
      JOIN form_submissions fs ON fs.id = fsa.submission_id
      WHERE fs.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Approvers can update own steps"
  ON form_submission_approval_steps FOR UPDATE
  USING (approver_id = auth.uid() AND status = 'pending');

CREATE POLICY "System can manage steps"
  ON form_submission_approval_steps FOR INSERT
  WITH CHECK (
    submission_approval_id IN (
      SELECT fsa.id FROM form_submission_approvals fsa
      JOIN form_submissions fs ON fs.id = fsa.submission_id
      WHERE fs.company_id = get_user_company_id()
    )
  );
