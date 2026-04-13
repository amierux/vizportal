CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  year INTEGER NOT NULL,
  total_days DECIMAL(5,1) NOT NULL,
  used_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  remaining_days DECIMAL(5,1) NOT NULL,
  carried_over_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(profile_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_company_id ON leave_balances(company_id);
CREATE INDEX idx_leave_balances_profile_id ON leave_balances(profile_id);

CREATE TRIGGER leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
