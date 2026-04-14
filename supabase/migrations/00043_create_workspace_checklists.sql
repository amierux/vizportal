CREATE TABLE workspace_task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_checklists_task ON workspace_task_checklists(task_id);

ALTER TABLE workspace_task_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklists"
  ON workspace_task_checklists FOR SELECT
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Members can manage checklists"
  ON workspace_task_checklists FOR ALL
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE TABLE workspace_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES workspace_task_checklists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false NOT NULL,
  position INTEGER NOT NULL,
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_checklist_items_checklist ON workspace_checklist_items(checklist_id);

ALTER TABLE workspace_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items"
  ON workspace_checklist_items FOR SELECT
  USING (
    checklist_id IN (
      SELECT id FROM workspace_task_checklists
      WHERE task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
    )
  );

CREATE POLICY "Members can manage checklist items"
  ON workspace_checklist_items FOR ALL
  USING (
    checklist_id IN (
      SELECT id FROM workspace_task_checklists
      WHERE task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
    )
  );
