ALTER TABLE form_approvers ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE form_approvers ADD COLUMN approver_email TEXT;
ALTER TABLE form_approvers ADD COLUMN approver_name TEXT;
ALTER TABLE form_approvers ADD CONSTRAINT form_approvers_has_identity
  CHECK (profile_id IS NOT NULL OR approver_email IS NOT NULL);

ALTER TABLE form_submission_approval_steps ALTER COLUMN approver_id DROP NOT NULL;
ALTER TABLE form_submission_approval_steps ADD COLUMN approver_email TEXT;
ALTER TABLE form_submission_approval_steps ADD COLUMN approver_name TEXT;
ALTER TABLE form_submission_approval_steps ADD COLUMN token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL;
ALTER TABLE form_submission_approval_steps ADD CONSTRAINT form_submission_approval_steps_has_identity
  CHECK (approver_id IS NOT NULL OR approver_email IS NOT NULL);

CREATE INDEX idx_form_submission_approval_steps_token ON form_submission_approval_steps(token);
