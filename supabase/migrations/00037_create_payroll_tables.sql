CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')) DEFAULT 'draft' NOT NULL,
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_payroll_periods_company ON payroll_periods(company_id);

CREATE TRIGGER payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR/BM/Director can view payroll periods"
  ON payroll_periods FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr', 'business_manager', 'director']));

CREATE POLICY "Admin/HR can manage payroll periods"
  ON payroll_periods FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE TABLE payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  days_worked DECIMAL(5,1) DEFAULT 0 NOT NULL,
  days_absent DECIMAL(5,1) DEFAULT 0 NOT NULL,
  days_late INTEGER DEFAULT 0 NOT NULL,
  late_minutes_total INTEGER DEFAULT 0 NOT NULL,
  undertime_minutes_total INTEGER DEFAULT 0 NOT NULL,
  ot_regular_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  ot_rest_day_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  ot_holiday_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  paid_leave_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  unpaid_leave_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  holiday_pay_days DECIMAL(5,1) DEFAULT 0 NOT NULL,
  basic_pay DECIMAL(12,2) NOT NULL,
  ot_pay DECIMAL(12,2) DEFAULT 0 NOT NULL,
  holiday_pay DECIMAL(12,2) DEFAULT 0 NOT NULL,
  late_deduction DECIMAL(12,2) DEFAULT 0 NOT NULL,
  undertime_deduction DECIMAL(12,2) DEFAULT 0 NOT NULL,
  absent_deduction DECIMAL(12,2) DEFAULT 0 NOT NULL,
  unpaid_leave_deduction DECIMAL(12,2) DEFAULT 0 NOT NULL,
  gross_pay DECIMAL(12,2) NOT NULL,
  sss_contribution DECIMAL(10,2) DEFAULT 0 NOT NULL,
  philhealth_contribution DECIMAL(10,2) DEFAULT 0 NOT NULL,
  pagibig_contribution DECIMAL(10,2) DEFAULT 0 NOT NULL,
  withholding_tax DECIMAL(10,2) DEFAULT 0 NOT NULL,
  custom_deductions_total DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_deductions DECIMAL(12,2) NOT NULL,
  net_pay DECIMAL(12,2) NOT NULL,
  bank_credited BOOLEAN DEFAULT false NOT NULL,
  bank_credited_at TIMESTAMPTZ,
  bank_credited_by UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('draft', 'finalized')) DEFAULT 'draft' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(payroll_period_id, profile_id)
);

CREATE INDEX idx_payroll_entries_period ON payroll_entries(payroll_period_id);
CREATE INDEX idx_payroll_entries_profile ON payroll_entries(profile_id);

CREATE TRIGGER payroll_entries_updated_at
  BEFORE UPDATE ON payroll_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR/BM/Director can view all payroll entries"
  ON payroll_entries FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr', 'business_manager', 'director']));

CREATE POLICY "Users can view own payroll entries"
  ON payroll_entries FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can manage payroll entries"
  ON payroll_entries FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE TABLE payroll_custom_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id UUID REFERENCES payroll_entries(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('deduction', 'adjustment')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_payroll_custom_deductions_entry ON payroll_custom_deductions(payroll_entry_id);

ALTER TABLE payroll_custom_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can view all custom deductions"
  ON payroll_custom_deductions FOR SELECT
  USING (
    payroll_entry_id IN (
      SELECT id FROM payroll_entries WHERE company_id = get_user_company_id()
    )
    AND has_any_role(ARRAY['admin', 'hr', 'business_manager', 'director'])
  );

CREATE POLICY "Users can view own custom deductions"
  ON payroll_custom_deductions FOR SELECT
  USING (
    payroll_entry_id IN (
      SELECT id FROM payroll_entries WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admin/HR can manage custom deductions"
  ON payroll_custom_deductions FOR ALL
  USING (
    payroll_entry_id IN (
      SELECT id FROM payroll_entries WHERE company_id = get_user_company_id()
    )
    AND has_any_role(ARRAY['admin', 'hr'])
  );
