-- Add 'any_order' mode: all approvers must approve but order doesn't matter

ALTER TABLE form_approval_configs DROP CONSTRAINT IF EXISTS form_approval_configs_approval_mode_check;
ALTER TABLE form_approval_configs ADD CONSTRAINT form_approval_configs_approval_mode_check
  CHECK (approval_mode IN ('hierarchical', 'any_one', 'any_order'));

ALTER TABLE form_submission_approvals DROP CONSTRAINT IF EXISTS form_submission_approvals_approval_mode_check;
ALTER TABLE form_submission_approvals ADD CONSTRAINT form_submission_approvals_approval_mode_check
  CHECK (approval_mode IN ('hierarchical', 'any_one', 'any_order'));
