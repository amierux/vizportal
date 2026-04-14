-- Relax forms permissions — everyone can create forms, view own forms, edit own forms.
-- Admin still has full access.

-- Drop existing form policies
DROP POLICY IF EXISTS "Admin/HR can view all forms" ON forms;
DROP POLICY IF EXISTS "Users can view published forms" ON forms;
DROP POLICY IF EXISTS "Admin can manage forms" ON forms;

-- Recreate with relaxed permissions
CREATE POLICY "Users can view forms in their company"
  ON forms FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create forms"
  ON forms FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND created_by = auth.uid());

CREATE POLICY "Users can update own forms"
  ON forms FOR UPDATE
  USING (company_id = get_user_company_id() AND (created_by = auth.uid() OR has_role('admin')));

CREATE POLICY "Users can delete own forms"
  ON forms FOR DELETE
  USING (company_id = get_user_company_id() AND (created_by = auth.uid() OR has_role('admin')));

-- Form sections — relax to creator or admin
DROP POLICY IF EXISTS "Users can view form sections" ON form_sections;
DROP POLICY IF EXISTS "Admin can manage form sections" ON form_sections;

CREATE POLICY "Users can view form sections"
  ON form_sections FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()));

CREATE POLICY "Form creators can manage sections"
  ON form_sections FOR ALL
  USING (
    form_id IN (
      SELECT id FROM forms
      WHERE company_id = get_user_company_id()
      AND (created_by = auth.uid() OR has_role('admin'))
    )
  );

-- Form fields — relax similarly
DROP POLICY IF EXISTS "Users can view form fields" ON form_fields;
DROP POLICY IF EXISTS "Admin can manage form fields" ON form_fields;

CREATE POLICY "Users can view form fields"
  ON form_fields FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()));

CREATE POLICY "Form creators can manage fields"
  ON form_fields FOR ALL
  USING (
    form_id IN (
      SELECT id FROM forms
      WHERE company_id = get_user_company_id()
      AND (created_by = auth.uid() OR has_role('admin'))
    )
  );

-- Form approval configs — relax similarly
DROP POLICY IF EXISTS "Admin can view form approval configs" ON form_approval_configs;
DROP POLICY IF EXISTS "Admin can manage form approval configs" ON form_approval_configs;

CREATE POLICY "Users can view form approval configs"
  ON form_approval_configs FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()));

CREATE POLICY "Form creators can manage approval configs"
  ON form_approval_configs FOR ALL
  USING (
    form_id IN (
      SELECT id FROM forms
      WHERE company_id = get_user_company_id()
      AND (created_by = auth.uid() OR has_role('admin'))
    )
  );

DROP POLICY IF EXISTS "Admin can manage form approval steps" ON form_approval_steps;

CREATE POLICY "Form creators can manage approval steps"
  ON form_approval_steps FOR ALL
  USING (
    form_approval_config_id IN (
      SELECT fac.id FROM form_approval_configs fac
      JOIN forms f ON f.id = fac.form_id
      WHERE f.company_id = get_user_company_id()
      AND (f.created_by = auth.uid() OR has_role('admin'))
    )
  );

-- Form assignments — allow form creators to assign
DROP POLICY IF EXISTS "Admin can manage assignments" ON form_assignments;

CREATE POLICY "Form creators can manage assignments"
  ON form_assignments FOR ALL
  USING (
    form_id IN (
      SELECT id FROM forms
      WHERE company_id = get_user_company_id()
      AND (created_by = auth.uid() OR has_role('admin'))
    )
  );
