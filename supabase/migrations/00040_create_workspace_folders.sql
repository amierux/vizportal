-- ============================================================
-- CREATE TABLES FIRST (before policies that cross-reference)
-- ============================================================

-- Workspace folders
CREATE TABLE workspace_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1' NOT NULL,
  icon TEXT DEFAULT '📁' NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_folders_company ON workspace_folders(company_id);

CREATE TRIGGER workspace_folders_updated_at
  BEFORE UPDATE ON workspace_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Folder members
CREATE TABLE workspace_folder_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES workspace_folders(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  permission TEXT CHECK (permission IN ('viewer', 'creator', 'editor', 'admin')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(folder_id, profile_id)
);

CREATE INDEX idx_workspace_folder_members_folder ON workspace_folder_members(folder_id);
CREATE INDEX idx_workspace_folder_members_profile ON workspace_folder_members(profile_id);

-- Folder statuses
CREATE TABLE workspace_folder_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES workspace_folders(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_done BOOLEAN DEFAULT false NOT NULL,
  requires_approval BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_folder_statuses_folder ON workspace_folder_statuses(folder_id);

-- ============================================================
-- RLS POLICIES (all tables exist now)
-- ============================================================

ALTER TABLE workspace_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders they are members of"
  ON workspace_folders FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid())
      OR has_any_role(ARRAY['admin', 'hr'])
    )
  );

CREATE POLICY "TL/DM/Director can create folders"
  ON workspace_folders FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['team_leader', 'dept_manager', 'director', 'admin'])
  );

CREATE POLICY "Folder admins can update"
  ON workspace_folders FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin')
      OR has_any_role(ARRAY['admin'])
    )
  );

CREATE POLICY "Folder admins can delete"
  ON workspace_folders FOR DELETE
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin')
      OR has_any_role(ARRAY['admin'])
    )
  );

ALTER TABLE workspace_folder_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folder members"
  ON workspace_folder_members FOR SELECT
  USING (
    folder_id IN (SELECT id FROM workspace_folders WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Folder admins can manage members"
  ON workspace_folder_members FOR ALL
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin'
    )
    OR has_role('admin')
  );

ALTER TABLE workspace_folder_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folder statuses"
  ON workspace_folder_statuses FOR SELECT
  USING (
    folder_id IN (SELECT id FROM workspace_folders WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Folder admins can manage statuses"
  ON workspace_folder_statuses FOR ALL
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin'
    )
    OR has_role('admin')
  );
