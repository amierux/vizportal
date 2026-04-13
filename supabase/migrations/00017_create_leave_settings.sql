CREATE TABLE leave_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) UNIQUE NOT NULL,
  reset_month INTEGER CHECK (reset_month BETWEEN 1 AND 12) DEFAULT 1 NOT NULL,
  reset_day INTEGER CHECK (reset_day BETWEEN 1 AND 31) DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER leave_settings_updated_at
  BEFORE UPDATE ON leave_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
