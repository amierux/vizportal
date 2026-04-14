CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, key)
);

CREATE INDEX idx_system_settings_company_id ON system_settings(company_id);

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view system settings"
  ON system_settings FOR SELECT
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can manage system settings"
  ON system_settings FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));
