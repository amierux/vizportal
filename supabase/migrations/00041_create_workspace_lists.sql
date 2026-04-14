CREATE TABLE workspace_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES workspace_folders(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  status_override BOOLEAN DEFAULT false NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_lists_folder ON workspace_lists(folder_id);

CREATE TRIGGER workspace_lists_updated_at
  BEFORE UPDATE ON workspace_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workspace_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lists in accessible folders"
  ON workspace_lists FOR SELECT
  USING (
    folder_id IN (
      SELECT id FROM workspace_folders WHERE company_id = get_user_company_id()
      AND (
        id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid())
        OR has_any_role(ARRAY['admin', 'hr'])
      )
    )
  );

CREATE POLICY "Creators+ can create lists"
  ON workspace_lists FOR INSERT
  WITH CHECK (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members
      WHERE profile_id = auth.uid() AND permission IN ('creator', 'editor', 'admin')
    )
    OR has_role('admin')
  );

CREATE POLICY "Editors+ can update lists"
  ON workspace_lists FOR UPDATE
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members
      WHERE profile_id = auth.uid() AND permission IN ('editor', 'admin')
    )
    OR has_role('admin')
  );

CREATE POLICY "Admins can delete lists"
  ON workspace_lists FOR DELETE
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members
      WHERE profile_id = auth.uid() AND permission = 'admin'
    )
    OR has_role('admin')
  );

-- List status overrides
CREATE TABLE workspace_list_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES workspace_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_done BOOLEAN DEFAULT false NOT NULL,
  requires_approval BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_list_statuses_list ON workspace_list_statuses(list_id);

ALTER TABLE workspace_list_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view list statuses"
  ON workspace_list_statuses FOR SELECT
  USING (
    list_id IN (SELECT id FROM workspace_lists WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Editors+ can manage list statuses"
  ON workspace_list_statuses FOR ALL
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      JOIN workspace_folder_members wfm ON wfm.folder_id = wl.folder_id
      WHERE wfm.profile_id = auth.uid() AND wfm.permission IN ('editor', 'admin')
    )
    OR has_role('admin')
  );
