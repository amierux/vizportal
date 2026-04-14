-- Tighten forms SELECT: users see only published forms + their own forms + admin sees all.

DROP POLICY IF EXISTS "Users can view forms in their company" ON forms;

CREATE POLICY "Users can view own or published forms"
  ON forms FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND (
      created_by = auth.uid()
      OR status = 'published'
      OR has_role('admin')
    )
  );
