CREATE TABLE non_working_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  country TEXT DEFAULT 'PH' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_non_working_days_company_id ON non_working_days(company_id);
CREATE INDEX idx_non_working_days_company_date ON non_working_days(company_id, date);

ALTER TABLE non_working_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non working days"
  ON non_working_days FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage non working days"
  ON non_working_days FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));
