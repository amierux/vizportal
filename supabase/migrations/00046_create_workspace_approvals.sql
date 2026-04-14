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
