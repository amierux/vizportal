# Payroll Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PH-compliant payroll module with auto-computation from attendance/leave/overtime, statutory deductions (SSS, PhilHealth, Pag-IBIG, withholding tax), custom deductions, configurable processing rules, payslip generation, and bank credit management.

**Architecture:** 8 new database tables + 2 column additions. Payroll computation engine reads attendance summaries, approved leave/overtime requests, and non-working days to auto-calculate pay. PH contribution tables pre-seeded with 2025 rates. Processing flow: create period → auto-compute entries → manual adjustments → finalize → export → mark credited. Payslips generated as printable HTML for PDF.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth), Tailwind + shadcn/ui, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-04-14-payroll-module-design.md`

---

## File Structure

```
vizportal/
├── supabase/migrations/
│   ├── 00035_add_employee_bank_details.sql
│   ├── 00036_create_payroll_settings.sql
│   ├── 00037_create_payroll_tables.sql
│   ├── 00038_create_contribution_tables.sql
│   └── 00039_seed_ph_contributions.sql
├── src/
│   ├── app/(portal)/
│   │   ├── payroll/
│   │   │   ├── page.tsx                           # My Payroll + All Members
│   │   │   └── process/
│   │   │       ├── page.tsx                       # Period setup + readiness
│   │   │       └── [profileId]/page.tsx           # Per-employee detail
│   │   ├── employees/[id]/page.tsx                # MODIFY — add Salary tab
│   │   └── settings/payroll/page.tsx              # Payroll settings
│   ├── components/
│   │   ├── payroll/
│   │   │   ├── my-payroll-table.tsx               # Employee's own payroll entries
│   │   │   ├── all-payroll-table.tsx              # Admin payroll entries with filters
│   │   │   ├── payslip-detail.tsx                 # Payslip breakdown view
│   │   │   ├── employee-readiness-table.tsx       # Processing readiness check
│   │   │   ├── payroll-entry-form.tsx             # Per-employee computation edit
│   │   │   └── process-payroll-button.tsx         # Process button + dialog
│   │   ├── settings/
│   │   │   ├── payroll-settings-form.tsx          # Schedule, toggles, multipliers
│   │   │   ├── custom-deduction-types-table.tsx   # CRUD for deduction types
│   │   │   └── contribution-tables-editor.tsx     # SSS/PhilHealth/PagIBIG/Tax editor
│   │   └── employees/
│   │       └── salary-tab.tsx                     # Salary + bank + recurring deductions
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── payroll.ts                         # Core payroll actions
│   │   │   ├── payroll-settings.ts                # Settings CRUD
│   │   │   ├── payroll-computation.ts             # Auto-computation engine
│   │   │   └── contribution-tables.ts             # PH contribution table actions
│   │   ├── validations/
│   │   │   └── payroll.ts                         # Zod schemas
│   │   └── utils/
│   │       └── payroll.ts                         # Computation helpers
│   └── types/
│       ├── database.ts                            # MODIFY — 8 new tables + columns
│       └── index.ts                               # MODIFY — new type aliases
```

---

## Task 1: Database Migrations

**Files:**
- Create: 5 migration files in `vizportal/supabase/migrations/`

- [ ] **Step 1: Create migration 00035 — employee bank details**

Create `vizportal/supabase/migrations/00035_add_employee_bank_details.sql`:

```sql
ALTER TABLE employee_details ADD COLUMN bank_name TEXT;
ALTER TABLE employee_details ADD COLUMN bank_account_number TEXT;
```

- [ ] **Step 2: Create migration 00036 — payroll_settings**

Create `vizportal/supabase/migrations/00036_create_payroll_settings.sql`:

```sql
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
```

- [ ] **Step 3: Create migration 00037 — payroll core tables**

Create `vizportal/supabase/migrations/00037_create_payroll_tables.sql`:

```sql
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
```

- [ ] **Step 4: Create migration 00038 — PH contribution + tax tables**

Create `vizportal/supabase/migrations/00038_create_contribution_tables.sql`:

```sql
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
```

- [ ] **Step 5: Create migration 00039 — seed PH contributions**

Create `vizportal/supabase/migrations/00039_seed_ph_contributions.sql`:

```sql
-- 2025 SSS Contribution Table (simplified brackets)
INSERT INTO ph_contribution_tables (type, salary_from, salary_to, employee_share, employer_share, effective_year) VALUES
  ('sss', 0, 4250, 180, 390, 2025),
  ('sss', 4250, 4750, 202.50, 427.50, 2025),
  ('sss', 4750, 5250, 225, 465, 2025),
  ('sss', 5250, 5750, 247.50, 502.50, 2025),
  ('sss', 5750, 6250, 270, 540, 2025),
  ('sss', 6250, 6750, 292.50, 577.50, 2025),
  ('sss', 6750, 7250, 315, 615, 2025),
  ('sss', 7250, 7750, 337.50, 652.50, 2025),
  ('sss', 7750, 8250, 360, 690, 2025),
  ('sss', 8250, 8750, 382.50, 727.50, 2025),
  ('sss', 8750, 9250, 405, 765, 2025),
  ('sss', 9250, 9750, 427.50, 802.50, 2025),
  ('sss', 9750, 10250, 450, 840, 2025),
  ('sss', 10250, 10750, 472.50, 877.50, 2025),
  ('sss', 10750, 11250, 495, 915, 2025),
  ('sss', 11250, 11750, 517.50, 952.50, 2025),
  ('sss', 11750, 12250, 540, 990, 2025),
  ('sss', 12250, 12750, 562.50, 1027.50, 2025),
  ('sss', 12750, 13250, 585, 1065, 2025),
  ('sss', 13250, 13750, 607.50, 1102.50, 2025),
  ('sss', 13750, 14250, 630, 1140, 2025),
  ('sss', 14250, 14750, 652.50, 1177.50, 2025),
  ('sss', 14750, 15250, 675, 1215, 2025),
  ('sss', 15250, 15750, 697.50, 1252.50, 2025),
  ('sss', 15750, 16250, 720, 1290, 2025),
  ('sss', 16250, 16750, 742.50, 1327.50, 2025),
  ('sss', 16750, 17250, 765, 1365, 2025),
  ('sss', 17250, 17750, 787.50, 1402.50, 2025),
  ('sss', 17750, 18250, 810, 1440, 2025),
  ('sss', 18250, 18750, 832.50, 1477.50, 2025),
  ('sss', 18750, 19250, 855, 1515, 2025),
  ('sss', 19250, 19750, 877.50, 1552.50, 2025),
  ('sss', 19750, 20250, 900, 1590, 2025),
  ('sss', 20250, 20750, 900, 1590, 2025),
  ('sss', 20750, 99999999, 900, 1590, 2025);

-- 2025 PhilHealth (5% of basic, split 50/50, cap at 5000 monthly salary)
INSERT INTO ph_contribution_tables (type, salary_from, salary_to, employee_share, employer_share, effective_year) VALUES
  ('philhealth', 0, 10000, 250, 250, 2025),
  ('philhealth', 10000, 100000, 0, 0, 2025),
  ('philhealth', 100000, 99999999, 2500, 2500, 2025);

-- 2025 Pag-IBIG
INSERT INTO ph_contribution_tables (type, salary_from, salary_to, employee_share, employer_share, effective_year) VALUES
  ('pagibig', 0, 1500, 15, 30, 2025),
  ('pagibig', 1500, 5000, 50, 100, 2025),
  ('pagibig', 5000, 99999999, 200, 200, 2025);

-- 2025 BIR TRAIN Law Monthly Tax Brackets
INSERT INTO ph_tax_brackets (compensation_from, compensation_to, tax_rate, base_tax, frequency, effective_year) VALUES
  (0, 20833, 0, 0, 'monthly', 2025),
  (20833, 33333, 0.15, 0, 'monthly', 2025),
  (33333, 66667, 0.20, 1875, 'monthly', 2025),
  (66667, 166667, 0.25, 8541.80, 'monthly', 2025),
  (166667, 666667, 0.30, 33541.80, 'monthly', 2025),
  (666667, 999999999, 0.35, 183541.80, 'monthly', 2025);

-- Semi-monthly brackets (monthly / 2)
INSERT INTO ph_tax_brackets (compensation_from, compensation_to, tax_rate, base_tax, frequency, effective_year) VALUES
  (0, 10417, 0, 0, 'semi_monthly', 2025),
  (10417, 16667, 0.15, 0, 'semi_monthly', 2025),
  (16667, 33333, 0.20, 937.50, 'semi_monthly', 2025),
  (33333, 83333, 0.25, 4270.90, 'semi_monthly', 2025),
  (83333, 333333, 0.30, 16770.90, 'semi_monthly', 2025),
  (333333, 999999999, 0.35, 91770.90, 'semi_monthly', 2025);

-- Weekly brackets (monthly / 4.33)
INSERT INTO ph_tax_brackets (compensation_from, compensation_to, tax_rate, base_tax, frequency, effective_year) VALUES
  (0, 4808, 0, 0, 'weekly', 2025),
  (4808, 7692, 0.15, 0, 'weekly', 2025),
  (7692, 15385, 0.20, 432.69, 'weekly', 2025),
  (15385, 38462, 0.25, 1971.15, 'weekly', 2025),
  (38462, 153846, 0.30, 7740.38, 'weekly', 2025),
  (153846, 999999999, 0.35, 42355.77, 'weekly', 2025);
```

Note: PhilHealth 2025 is 5% of basic salary, employee pays 2.5%, employer 2.5%, with floor of ₱500 total (₱250 each) and ceiling at ₱200,000 salary (₱5,000 total). The seed above is simplified — the computation engine will handle the percentage-based calculation and use the table as min/max bounds.

- [ ] **Step 6: Push migrations**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npx supabase db push
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add payroll migrations — settings, periods, entries, contributions, tax brackets"
```

---

## Task 2: Database Types + Routes + Navigation

**Files:**
- Modify: `vizportal/src/types/database.ts`
- Modify: `vizportal/src/types/index.ts`
- Modify: `vizportal/src/lib/constants.ts`
- Modify: `vizportal/src/components/layout/header.tsx`
- Modify: `vizportal/src/components/layout/sidebar.tsx`
- Modify: `vizportal/src/components/layout/bottom-tabs.tsx`
- Modify: `vizportal/src/components/settings/settings-nav.tsx`

- [ ] **Step 1: Add bank fields to employee_details type**

In `database.ts`, add to employee_details Row (after `employment_status`):
```typescript
          bank_name: string | null;
          bank_account_number: string | null;
```
Add to Insert and Update as optional.

- [ ] **Step 2: Add 8 new table types to database.ts**

Add table definitions for: `payroll_settings`, `payroll_periods`, `payroll_entries`, `payroll_custom_deductions`, `custom_deduction_types`, `recurring_deductions`, `ph_contribution_tables`, `ph_tax_brackets`.

Each with full Row, Insert, Update, Relationships shapes matching the migration columns.

- [ ] **Step 3: Add type aliases to index.ts**

```typescript
export type PayrollSettings = Database["public"]["Tables"]["payroll_settings"]["Row"];
export type PayrollPeriod = Database["public"]["Tables"]["payroll_periods"]["Row"];
export type PayrollEntry = Database["public"]["Tables"]["payroll_entries"]["Row"];
export type PayrollCustomDeduction = Database["public"]["Tables"]["payroll_custom_deductions"]["Row"];
export type CustomDeductionType = Database["public"]["Tables"]["custom_deduction_types"]["Row"];
export type RecurringDeduction = Database["public"]["Tables"]["recurring_deductions"]["Row"];
export type PhContributionTable = Database["public"]["Tables"]["ph_contribution_tables"]["Row"];
export type PhTaxBracket = Database["public"]["Tables"]["ph_tax_brackets"]["Row"];
```

- [ ] **Step 4: Add routes, titles, navigation**

Routes in constants.ts:
```typescript
  "/payroll": [],
  "/payroll/process": ["admin", "hr", "business_manager", "director"],
  "/settings/payroll": ["admin"],
```

Page titles in header.tsx:
```typescript
    "/payroll": "Payroll",
    "/payroll/process": "Process Payroll",
    "/settings/payroll": "Payroll Settings",
```

Sidebar: add "Payroll" with `Wallet` icon from lucide-react, between Overtime and Approvals, `roles: []`.

Bottom tabs: add "Payroll" tab.

Settings nav: add `{ label: "Payroll", href: "/settings/payroll", roles: ["admin"] }`.

- [ ] **Step 5: Verify build + commit**

```bash
npm run build
git add src/types/ src/lib/constants.ts src/components/layout/ src/components/settings/settings-nav.tsx
git commit -m "feat: add payroll types, routes, and navigation"
```

---

## Task 3: Payroll Computation Utilities

**Files:**
- Create: `vizportal/src/lib/utils/payroll.ts`
- Create: `vizportal/src/lib/validations/payroll.ts`

- [ ] **Step 1: Create payroll utility helpers**

Create `vizportal/src/lib/utils/payroll.ts` with:
- `calculateDailyRate(monthlySalary, workingDaysPerMonth)` — returns daily rate
- `calculateHourlyRate(dailyRate, hoursPerDay)` — returns hourly rate
- `calculateOtPay(hours, hourlyRate, multiplier)` — returns OT pay amount
- `calculateLateDecution(lateMinutes, hourlyRate)` — returns deduction
- `lookupSssContribution(monthlySalary, year)` — looks up from table
- `calculatePhilhealthContribution(monthlySalary)` — 2.5% of salary, min 250, max 2500
- `lookupPagibigContribution(monthlySalary, year)` — looks up from table
- `calculateWithholdingTax(taxableIncome, frequency, year)` — BIR bracket lookup
- `calculateBasicPay(salary, scheduleType)` — prorates based on schedule

- [ ] **Step 2: Create payroll validation schemas**

Create `vizportal/src/lib/validations/payroll.ts` with:
- `payrollSettingsSchema` — schedule_type, pay_day_1, pay_day_2, cutoff, toggles, multipliers
- `payrollPeriodSchema` — start_date, end_date, pay_date
- `customDeductionSchema` — name, type, amount, notes

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/lib/utils/payroll.ts src/lib/validations/payroll.ts
git commit -m "feat: add payroll computation utilities and validation schemas"
```

---

## Task 4: Payroll Settings Server Actions + UI

**Files:**
- Create: `vizportal/src/lib/actions/payroll-settings.ts`
- Create: `vizportal/src/lib/actions/contribution-tables.ts`
- Create: `vizportal/src/components/settings/payroll-settings-form.tsx`
- Create: `vizportal/src/components/settings/custom-deduction-types-table.tsx`
- Create: `vizportal/src/components/settings/contribution-tables-editor.tsx`
- Create: `vizportal/src/app/(portal)/settings/payroll/page.tsx`

Server actions for:
- `getPayrollSettings()`, `updatePayrollSettings(_prevState, formData)`
- `getCustomDeductionTypes()`, `createCustomDeductionType(...)`, `toggleCustomDeductionType(...)`
- `getContributionTables(year)`, `updateContributionTable(...)` 
- `getTaxBrackets(frequency, year)`, `updateTaxBracket(...)`

UI: Payroll settings page with 4 card sections:
1. Schedule configuration (dropdowns + inputs)
2. Computation rules (toggles + multiplier inputs)
3. Custom deduction types (CRUD table)
4. PH contribution tables (SSS/PhilHealth/PagIBIG/Tax editable tables)

- [ ] **Step 1: Create all action files**
- [ ] **Step 2: Create all component files**
- [ ] **Step 3: Create settings page**
- [ ] **Step 4: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/lib/actions/payroll-settings.ts src/lib/actions/contribution-tables.ts src/components/settings/ src/app/\(portal\)/settings/payroll/
git commit -m "feat: add payroll settings — schedule, rules, deduction types, contribution tables"
```

---

## Task 5: Salary Tab on Employee Detail Page

**Files:**
- Create: `vizportal/src/components/employees/salary-tab.tsx`
- Modify: `vizportal/src/app/(portal)/employees/[id]/page.tsx`

Salary tab shows:
- Basic monthly salary (editable)
- Daily rate (auto-calculated, read-only)
- Hourly rate (auto-calculated, read-only)
- Bank name + account number (editable)
- Recurring deductions table: deduction type dropdown, amount, start/end date, active toggle, add/remove

Visible to HR, admin, business_manager, director only.

- [ ] **Step 1: Create salary tab component**
- [ ] **Step 2: Add Salary tab to employee detail page**
- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/components/employees/salary-tab.tsx src/app/\(portal\)/employees/\[id\]/page.tsx
git commit -m "feat: add Salary tab to employee detail — salary, bank, recurring deductions"
```

---

## Task 6: Core Payroll Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/payroll.ts`
- Create: `vizportal/src/lib/actions/payroll-computation.ts`

`payroll.ts` — CRUD for periods and entries:
- `createPayrollPeriod(startDate, endDate, payDate)` — creates period in 'draft'
- `getPayrollPeriods()` — list periods
- `getPayrollEntries(periodId)` — all entries for a period with profile data
- `getMyPayrollEntries()` — current user's entries
- `getPayrollEntry(entryId)` — single entry with custom deductions
- `updatePayrollEntry(entryId, data)` — manual adjustment of any field
- `addCustomDeduction(entryId, name, type, amount, notes)`
- `removeCustomDeduction(deductionId)`
- `finalizePayroll(periodId)` — marks all entries finalized, period completed
- `markBankCredited(entryId)` / `bulkMarkCredited(periodId)`

`payroll-computation.ts` — auto-computation engine:
- `computePayrollForPeriod(periodId)` — creates/updates entries for all active employees:
  1. For each employee, fetch: salary, schedule, attendance summaries, approved leaves, approved OT, non-working days
  2. Calculate all fields using utils
  3. Apply recurring deductions
  4. Upsert payroll_entries

- [ ] **Step 1: Create payroll.ts with all CRUD actions**
- [ ] **Step 2: Create payroll-computation.ts with auto-compute engine**
- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/lib/actions/payroll.ts src/lib/actions/payroll-computation.ts
git commit -m "feat: add payroll server actions — CRUD, computation engine"
```

---

## Task 7: Payroll UI Components

**Files:**
- Create: 6 components in `vizportal/src/components/payroll/`

1. `my-payroll-table.tsx` — employee's own entries: period, gross, deductions, net, status, bank badge, view payslip button
2. `all-payroll-table.tsx` — admin view with filters (period, department, search) + export CSV/PDF
3. `payslip-detail.tsx` — breakdown view: earnings table, deductions table, totals, download PDF button
4. `employee-readiness-table.tsx` — processing page: employee list with salary/schedule/bank status indicators + edit links
5. `payroll-entry-form.tsx` — per-employee computation form: all fields editable, custom deductions section with add/remove, save button
6. `process-payroll-button.tsx` — button that links to `/payroll/process`

- [ ] **Step 1: Create all 6 components**
- [ ] **Step 2: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/payroll/
git commit -m "feat: add payroll UI — tables, payslip, readiness, entry form"
```

---

## Task 8: Payroll Pages

**Files:**
- Create: `vizportal/src/app/(portal)/payroll/page.tsx`
- Create: `vizportal/src/app/(portal)/payroll/process/page.tsx`
- Create: `vizportal/src/app/(portal)/payroll/process/[profileId]/page.tsx`

1. `/payroll` — tabs: My Payroll (all) + All Members (admin/HR/BM/director), process button
2. `/payroll/process` — period setup + employee readiness table + finalize/export/credit buttons
3. `/payroll/process/[profileId]` — per-employee computation detail form

- [ ] **Step 1: Create main payroll page**
- [ ] **Step 2: Create process page**
- [ ] **Step 3: Create per-employee process page**
- [ ] **Step 4: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/app/\(portal\)/payroll/
git commit -m "feat: add payroll pages — my payroll, processing, per-employee detail"
```

---

## Task 9: Final Integration + Deploy

- [ ] **Step 1: Run full verification**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npm test && npm run build && npm run lint
```

- [ ] **Step 2: Push migrations**

```bash
npx supabase db push
```

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod --yes
```
