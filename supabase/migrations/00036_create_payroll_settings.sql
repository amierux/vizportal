CREATE TABLE payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) UNIQUE NOT NULL,
  schedule_type TEXT CHECK (schedule_type IN ('monthly', 'semi_monthly', 'weekly')) NOT NULL DEFAULT 'semi_monthly',
  pay_day_1 INTEGER NOT NULL DEFAULT 15,
  pay_day_2 INTEGER,
  cutoff_days_before INTEGER NOT NULL DEFAULT 5,
  is_enabled BOOLEAN DEFAULT false NOT NULL,
  enable_late_deduction BOOLEAN DEFAULT true NOT NULL,
  enable_undertime_deduction BOOLEAN DEFAULT true NOT NULL,
  enable_absent_deduction BOOLEAN DEFAULT true NOT NULL,
  ot_regular_multiplier DECIMAL(4,2) DEFAULT 1.25 NOT NULL,
  ot_rest_day_multiplier DECIMAL(4,2) DEFAULT 1.30 NOT NULL,
  ot_holiday_multiplier DECIMAL(4,2) DEFAULT 2.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER payroll_settings_updated_at
  BEFORE UPDATE ON payroll_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view payroll settings"
  ON payroll_settings FOR SELECT
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can manage payroll settings"
  ON payroll_settings FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE TABLE custom_deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER custom_deduction_types_updated_at
  BEFORE UPDATE ON custom_deduction_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE custom_deduction_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deduction types"
  ON custom_deduction_types FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage deduction types"
  ON custom_deduction_types FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE TABLE recurring_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  custom_deduction_type_id UUID REFERENCES custom_deduction_types(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_recurring_deductions_profile ON recurring_deductions(profile_id);

CREATE TRIGGER recurring_deductions_updated_at
  BEFORE UPDATE ON recurring_deductions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE recurring_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can view all recurring deductions"
  ON recurring_deductions FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can view own recurring deductions"
  ON recurring_deductions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can manage recurring deductions"
  ON recurring_deductions FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));
