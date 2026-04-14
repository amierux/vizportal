CREATE TABLE approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, type)
);

CREATE TRIGGER approval_configs_updated_at
  BEFORE UPDATE ON approval_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE approval_config_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_config_id UUID REFERENCES approval_configs(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_approval_config_steps_config ON approval_config_steps(approval_config_id);

ALTER TABLE approval_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_config_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval configs"
  ON approval_configs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage approval configs"
  ON approval_configs FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Users can view approval config steps"
  ON approval_config_steps FOR SELECT
  USING (
    approval_config_id IN (
      SELECT id FROM approval_configs WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "Admin can manage approval config steps"
  ON approval_config_steps FOR ALL
  USING (
    approval_config_id IN (
      SELECT id FROM approval_configs WHERE company_id = get_user_company_id()
    )
    AND has_role('admin')
  );
