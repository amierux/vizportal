CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  default_days DECIMAL(5,1) NOT NULL,
  is_paid BOOLEAN DEFAULT true NOT NULL,
  applicable_gender TEXT CHECK (applicable_gender IN ('all', 'male', 'female')) DEFAULT 'all' NOT NULL,
  requires_attachment BOOLEAN DEFAULT false NOT NULL,
  is_carry_over BOOLEAN DEFAULT false NOT NULL,
  max_carry_over_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE INDEX idx_leave_types_company_id ON leave_types(company_id);

CREATE TRIGGER leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
