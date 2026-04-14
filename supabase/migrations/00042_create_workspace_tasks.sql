CREATE TABLE workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES workspace_lists(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  parent_task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status_id UUID NOT NULL,
  assignee_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  start_date DATE,
  target_end_date DATE,
  completed_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')) DEFAULT 'none' NOT NULL,
  position INTEGER NOT NULL,
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  recurrence_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_tasks_list ON workspace_tasks(list_id);
CREATE INDEX idx_workspace_tasks_assignee ON workspace_tasks(assignee_id);
CREATE INDEX idx_workspace_tasks_parent ON workspace_tasks(parent_task_id);
CREATE INDEX idx_workspace_tasks_status ON workspace_tasks(status_id);

CREATE TRIGGER workspace_tasks_updated_at
  BEFORE UPDATE ON workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in accessible folders"
  ON workspace_tasks FOR SELECT
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid()
      )
    )
    OR has_any_role(ARRAY['admin', 'hr'])
  );

CREATE POLICY "Creators+ can create tasks"
  ON workspace_tasks FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members
        WHERE profile_id = auth.uid() AND permission IN ('creator', 'editor', 'admin')
      )
    )
    OR has_role('admin')
  );

CREATE POLICY "Editors+ can update tasks"
  ON workspace_tasks FOR UPDATE
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members
        WHERE profile_id = auth.uid() AND permission IN ('editor', 'admin')
      )
    )
    OR created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR has_role('admin')
  );

CREATE POLICY "Admins can delete tasks"
  ON workspace_tasks FOR DELETE
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members
        WHERE profile_id = auth.uid() AND permission = 'admin'
      )
    )
    OR created_by = auth.uid()
    OR has_role('admin')
  );

-- Task remarks
CREATE TABLE workspace_task_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_task_remarks_task ON workspace_task_remarks(task_id);

ALTER TABLE workspace_task_remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task remarks"
  ON workspace_task_remarks FOR SELECT
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Members can add remarks"
  ON workspace_task_remarks FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Task attachments
CREATE TABLE workspace_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_task_attachments_task ON workspace_task_attachments(task_id);

ALTER TABLE workspace_task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task attachments"
  ON workspace_task_attachments FOR SELECT
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Members can add attachments"
  ON workspace_task_attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete own attachments"
  ON workspace_task_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR has_role('admin'));
