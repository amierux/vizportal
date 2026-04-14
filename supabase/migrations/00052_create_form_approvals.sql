CREATE TABLE form_approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER form_approval_configs_updated_at
  BEFORE UPDATE ON form_approval_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE form_approval_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view form approval configs"
  ON form_approval_configs FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()));

CREATE POLICY "Admin can manage form approval configs"
  ON form_approval_configs FOR ALL
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_role('admin'));

CREATE TABLE form_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_approval_config_id UUID REFERENCES form_approval_configs(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE form_approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form approval steps"
  ON form_approval_steps FOR SELECT
  USING (
    form_approval_config_id IN (
      SELECT id FROM form_approval_configs WHERE form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id())
    )
  );

CREATE POLICY "Admin can manage form approval steps"
  ON form_approval_steps FOR ALL
  USING (
    form_approval_config_id IN (
      SELECT id FROM form_approval_configs WHERE form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id())
    )
    AND has_role('admin')
  );
