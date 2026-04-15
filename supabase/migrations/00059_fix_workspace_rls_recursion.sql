-- Fix infinite recursion: workspace_folders <-> workspace_folder_members policies referenced each other.
-- Solution: use a SECURITY DEFINER helper that bypasses RLS when checking membership.

CREATE OR REPLACE FUNCTION user_folder_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION user_admin_folder_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin';
$$;

-- Drop and recreate the recursive policies
DROP POLICY IF EXISTS "Users can view folders they are members of" ON workspace_folders;
DROP POLICY IF EXISTS "Folder admins can update" ON workspace_folders;
DROP POLICY IF EXISTS "Folder admins can delete" ON workspace_folders;
DROP POLICY IF EXISTS "Users can view folder members" ON workspace_folder_members;
DROP POLICY IF EXISTS "Folder admins can manage members" ON workspace_folder_members;

-- Folders SELECT — uses helper that bypasses RLS on folder_members
CREATE POLICY "Users can view folders they are members of"
  ON workspace_folders FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT user_folder_ids())
      OR has_any_role(ARRAY['admin', 'hr'])
    )
  );

CREATE POLICY "Folder admins can update"
  ON workspace_folders FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT user_admin_folder_ids())
      OR has_any_role(ARRAY['admin'])
    )
  );

CREATE POLICY "Folder admins can delete"
  ON workspace_folders FOR DELETE
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT user_admin_folder_ids())
      OR has_any_role(ARRAY['admin'])
    )
  );

-- folder_members SELECT — direct check (no folders cross-reference)
-- A user can see rows where: they are the member, OR they are an admin of the folder, OR global admin
CREATE POLICY "Users can view folder members"
  ON workspace_folder_members FOR SELECT
  USING (
    profile_id = auth.uid()
    OR folder_id IN (SELECT user_admin_folder_ids())
    OR has_role('admin')
  );

CREATE POLICY "Folder admins can manage members"
  ON workspace_folder_members FOR ALL
  USING (
    folder_id IN (SELECT user_admin_folder_ids())
    OR has_role('admin')
  );
