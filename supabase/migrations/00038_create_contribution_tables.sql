CREATE TABLE ph_contribution_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('sss', 'philhealth', 'pagibig')) NOT NULL,
  salary_from DECIMAL(12,2) NOT NULL,
  salary_to DECIMAL(12,2) NOT NULL,
  employee_share DECIMAL(10,2) NOT NULL,
  employer_share DECIMAL(10,2) NOT NULL,
  effective_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_ph_contribution_type_year ON ph_contribution_tables(type, effective_year);

ALTER TABLE ph_contribution_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contribution tables"
  ON ph_contribution_tables FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage contribution tables"
  ON ph_contribution_tables FOR ALL
  USING (has_role('admin'));

CREATE TABLE ph_tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compensation_from DECIMAL(12,2) NOT NULL,
  compensation_to DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,4) NOT NULL,
  base_tax DECIMAL(12,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('monthly', 'semi_monthly', 'weekly')) NOT NULL,
  effective_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_ph_tax_brackets_freq_year ON ph_tax_brackets(frequency, effective_year);

ALTER TABLE ph_tax_brackets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax brackets"
  ON ph_tax_brackets FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage tax brackets"
  ON ph_tax_brackets FOR ALL
  USING (has_role('admin'));
