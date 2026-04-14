# VizPortal Payroll Module — Design Spec

**Date:** 2026-04-14
**Project:** VizPortal — Multi-tenant internal portal for VizServe Inc.
**Phase:** 3 — Payroll
**Depends on:** Phase 2 (Attendance, Leave, Overtime, Approval Engine)

---

## 1. Overview

Full PH-compliant payroll module with:
- Configurable payroll schedule (monthly, semi-monthly, weekly)
- Auto-computation from attendance, leave, and overtime data
- PH statutory deductions (SSS, PhilHealth, Pag-IBIG, withholding tax) auto-calculated from current contribution tables
- Custom deduction types (loans, cash advances) with recurring support
- Toggleable computation rules (late/undertime/absent deductions)
- Payroll processing workflow with per-employee detail editing
- Payslip generation (in-app view + downloadable PDF)
- Bank credit confirmation (admin-controlled)
- Export to CSV and PDF

---

## 2. Database Schema

### 2.1 `payroll_settings`

Company-wide payroll configuration. One row per company.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, UNIQUE, NOT NULL | |
| schedule_type | TEXT | CHECK ('monthly','semi_monthly','weekly'), NOT NULL | |
| pay_day_1 | INTEGER | NOT NULL | Day of month (e.g., 15) |
| pay_day_2 | INTEGER | | For semi-monthly only (e.g., 30) |
| cutoff_days_before | INTEGER | DEFAULT 5, NOT NULL | Days before pay day to cut off attendance |
| is_enabled | BOOLEAN | DEFAULT false, NOT NULL | Master toggle |
| enable_late_deduction | BOOLEAN | DEFAULT true, NOT NULL | |
| enable_undertime_deduction | BOOLEAN | DEFAULT true, NOT NULL | |
| enable_absent_deduction | BOOLEAN | DEFAULT true, NOT NULL | |
| ot_regular_multiplier | DECIMAL(4,2) | DEFAULT 1.25, NOT NULL | Regular day OT |
| ot_rest_day_multiplier | DECIMAL(4,2) | DEFAULT 1.30, NOT NULL | Rest day/special holiday OT |
| ot_holiday_multiplier | DECIMAL(4,2) | DEFAULT 2.00, NOT NULL | Regular holiday OT |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.2 `payroll_periods`

Each pay cycle instance.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, NOT NULL | |
| start_date | DATE | NOT NULL | Period start |
| end_date | DATE | NOT NULL | Period end |
| pay_date | DATE | NOT NULL | Scheduled pay date |
| status | TEXT | CHECK ('draft','processing','completed','cancelled'), DEFAULT 'draft', NOT NULL | |
| processed_by | UUID | FK profiles | Who finalized |
| processed_at | TIMESTAMPTZ | | When finalized |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.3 `payroll_entries`

One per employee per pay period.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| payroll_period_id | UUID | FK payroll_periods, NOT NULL | |
| profile_id | UUID | FK profiles, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| basic_salary | DECIMAL(12,2) | NOT NULL | Monthly salary |
| daily_rate | DECIMAL(10,2) | NOT NULL | Computed |
| hourly_rate | DECIMAL(10,2) | NOT NULL | Computed |
| days_worked | DECIMAL(5,1) | DEFAULT 0, NOT NULL | From attendance |
| days_absent | DECIMAL(5,1) | DEFAULT 0, NOT NULL | From attendance |
| days_late | INTEGER | DEFAULT 0, NOT NULL | Count |
| late_minutes_total | INTEGER | DEFAULT 0, NOT NULL | Total late minutes |
| undertime_minutes_total | INTEGER | DEFAULT 0, NOT NULL | Total undertime |
| ot_regular_hours | DECIMAL(5,2) | DEFAULT 0, NOT NULL | |
| ot_rest_day_hours | DECIMAL(5,2) | DEFAULT 0, NOT NULL | |
| ot_holiday_hours | DECIMAL(5,2) | DEFAULT 0, NOT NULL | |
| paid_leave_days | DECIMAL(5,1) | DEFAULT 0, NOT NULL | |
| unpaid_leave_days | DECIMAL(5,1) | DEFAULT 0, NOT NULL | |
| holiday_pay_days | DECIMAL(5,1) | DEFAULT 0, NOT NULL | Regular holidays on work days |
| basic_pay | DECIMAL(12,2) | NOT NULL | Prorated basic for period |
| ot_pay | DECIMAL(12,2) | DEFAULT 0, NOT NULL | |
| holiday_pay | DECIMAL(12,2) | DEFAULT 0, NOT NULL | |
| late_deduction | DECIMAL(12,2) | DEFAULT 0, NOT NULL | |
| undertime_deduction | DECIMAL(12,2) | DEFAULT 0, NOT NULL | |
| absent_deduction | DECIMAL(12,2) | DEFAULT 0, NOT NULL | |
| unpaid_leave_deduction | DECIMAL(12,2) | DEFAULT 0, NOT NULL | |
| gross_pay | DECIMAL(12,2) | NOT NULL | |
| sss_contribution | DECIMAL(10,2) | DEFAULT 0, NOT NULL | |
| philhealth_contribution | DECIMAL(10,2) | DEFAULT 0, NOT NULL | |
| pagibig_contribution | DECIMAL(10,2) | DEFAULT 0, NOT NULL | |
| withholding_tax | DECIMAL(10,2) | DEFAULT 0, NOT NULL | |
| custom_deductions_total | DECIMAL(12,2) | DEFAULT 0, NOT NULL | |
| total_deductions | DECIMAL(12,2) | NOT NULL | Statutory + custom |
| net_pay | DECIMAL(12,2) | NOT NULL | |
| bank_credited | BOOLEAN | DEFAULT false, NOT NULL | |
| bank_credited_at | TIMESTAMPTZ | | |
| bank_credited_by | UUID | FK profiles | |
| status | TEXT | CHECK ('draft','finalized'), DEFAULT 'draft', NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

UNIQUE(payroll_period_id, profile_id)

### 2.4 `payroll_custom_deductions`

Per-entry custom deductions and adjustments.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| payroll_entry_id | UUID | FK payroll_entries ON DELETE CASCADE, NOT NULL | |
| name | TEXT | NOT NULL | e.g., "Company Loan" |
| type | TEXT | CHECK ('deduction','adjustment'), NOT NULL | Deduction subtracts, adjustment adds |
| amount | DECIMAL(12,2) | NOT NULL | |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.5 `custom_deduction_types`

Company-level reusable deduction type definitions.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| company_id | UUID | FK companies, NOT NULL | |
| name | TEXT | NOT NULL | e.g., "Company Loan", "Cash Advance" |
| is_active | BOOLEAN | DEFAULT true, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.6 `recurring_deductions`

Per-employee recurring deductions that auto-apply each payroll.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| profile_id | UUID | FK profiles, NOT NULL | |
| company_id | UUID | FK companies, NOT NULL | |
| custom_deduction_type_id | UUID | FK custom_deduction_types, NOT NULL | |
| amount | DECIMAL(12,2) | NOT NULL | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | | NULL = ongoing |
| is_active | BOOLEAN | DEFAULT true, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.7 `ph_contribution_tables`

SSS, PhilHealth, Pag-IBIG contribution brackets.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| type | TEXT | CHECK ('sss','philhealth','pagibig'), NOT NULL | |
| salary_from | DECIMAL(12,2) | NOT NULL | |
| salary_to | DECIMAL(12,2) | NOT NULL | |
| employee_share | DECIMAL(10,2) | NOT NULL | |
| employer_share | DECIMAL(10,2) | NOT NULL | |
| effective_year | INTEGER | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.8 `ph_tax_brackets`

BIR withholding tax brackets (TRAIN law).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| compensation_from | DECIMAL(12,2) | NOT NULL | |
| compensation_to | DECIMAL(12,2) | NOT NULL | |
| tax_rate | DECIMAL(5,4) | NOT NULL | e.g., 0.15 for 15% |
| base_tax | DECIMAL(12,2) | NOT NULL | Fixed amount |
| frequency | TEXT | CHECK ('monthly','semi_monthly','weekly'), NOT NULL | |
| effective_year | INTEGER | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Pre-seeded 2025 BIR TRAIN law monthly brackets:**

| From | To | Rate | Base Tax |
|------|----|------|----------|
| 0 | 20,833 | 0% | 0 |
| 20,833 | 33,333 | 15% | 0 |
| 33,333 | 66,667 | 20% | 1,875 |
| 66,667 | 166,667 | 25% | 8,541.80 |
| 166,667 | 666,667 | 30% | 33,541.80 |
| 666,667 | 999,999,999 | 35% | 183,541.80 |

### 2.9 Employee Details Extensions

Add to existing `employee_details` table:
```sql
ALTER TABLE employee_details ADD COLUMN bank_name TEXT;
ALTER TABLE employee_details ADD COLUMN bank_account_number TEXT;
```

---

## 3. Payroll Settings

### 3.1 Route

`/settings/payroll` — admin only. New tab in settings nav.

### 3.2 UI Sections

**Schedule Configuration:**
- Schedule type dropdown (monthly, semi-monthly, weekly)
- Pay day 1 (number input, day of month)
- Pay day 2 (number input, shown only for semi-monthly)
- Cutoff days before pay day (number input)

**Processing:**
- Enable/disable payroll processing toggle

**Computation Rules:**
- Enable late deductions toggle
- Enable undertime deductions toggle
- Enable absent deductions toggle
- OT regular multiplier (number input, default 1.25)
- OT rest day multiplier (number input, default 1.30)
- OT holiday multiplier (number input, default 2.00)

**Custom Deduction Types:**
- CRUD table: name, active toggle, add/delete

**PH Contribution Tables:**
- SSS table: salary range, employee share, employer share — editable
- PhilHealth table: same format
- Pag-IBIG table: same format
- BIR tax brackets table: compensation range, rate, base tax — editable
- All pre-seeded with 2025 rates

---

## 4. Salary Setup

### 4.1 Location

Employee detail page (`/employees/[id]`) → new "Salary" tab. Visible to HR, admin, business_manager, director only.

### 4.2 Contents

- Basic monthly salary (editable input)
- Daily rate (auto-calculated: `salary / working_days_per_month` where working_days = based on schedule)
- Hourly rate (auto-calculated: `daily_rate / hours_per_day` from employee schedule)
- Bank name (text input)
- Bank account number (text input)
- SSS/PhilHealth/Pag-IBIG numbers (already exist in employee_details, displayed for reference)

**Recurring Deductions section:**
- Table: deduction type (dropdown from custom_deduction_types), amount, start date, end date, active toggle
- Add/edit/delete

---

## 5. Payroll Page

### 5.1 Route

`/payroll` — all authenticated users

### 5.2 Tabs

**My Payroll** (all users):
- List of own payroll entries: period dates, gross pay, net pay, status, bank credited badge
- Click entry → payslip detail view (in-app breakdown table)
- Download PDF payslip button per entry

**All Members** (admin, HR, business_manager, director):
- All entries with filters: period, department, employee search
- Export CSV / PDF
- Same records filter bar pattern as attendance/leave

### 5.3 Process Payroll Button

Visible to admin, HR, business_manager, director. Opens `/payroll/process`.

---

## 6. Payroll Processing Flow

### 6.1 Route: `/payroll/process`

**Step 1: Period Setup**
- Auto-shows next upcoming period based on payroll settings
- Start date, end date, pay date (editable)
- "Create Period" button → creates payroll_periods record in 'draft' status

**Step 2: Employee Readiness**
- Table of all active employees:
  - Name, department
  - Salary status: green check (salary + schedule + bank set) or red X (missing)
  - Edit button → navigates to `/payroll/process/[profileId]`

**Step 3: Per-Employee Detail** (`/payroll/process/[profileId]`)

Auto-computes from existing data:

**Attendance data** (from `daily_attendance_summary` in period range):
- Days worked = count of 'present' + 'late' status days
- Days absent = count of 'absent' status days
- Days late = count of 'late' status days
- Late minutes total = sum of late_minutes
- Undertime minutes total = sum of undertime_minutes

**Leave data** (from `leave_requests` approved in period range):
- Paid leave days (leave type is_paid = true)
- Unpaid leave days (leave type is_paid = false)

**Overtime data** (from `overtime_requests` approved in period range):
- Regular OT hours (OT on normal work days)
- Rest day OT hours (OT on non-work days per schedule)
- Holiday OT hours (OT on non_working_days)

**Holiday data** (from `non_working_days` in period range):
- Holiday pay days = non_working_days that fall on employee's scheduled work days

**Pay computation:**
```
basic_pay = salary × (working_days_in_period / total_working_days_in_month)
  — For semi-monthly: salary / 2
  — For monthly: full salary
  — For weekly: salary / 4.33

ot_pay = (ot_regular_hours × hourly_rate × ot_regular_multiplier)
       + (ot_rest_day_hours × hourly_rate × ot_rest_day_multiplier)
       + (ot_holiday_hours × hourly_rate × ot_holiday_multiplier)

holiday_pay = holiday_pay_days × daily_rate × 1.0
  (Regular holidays: additional 100% of daily rate on top of basic)

late_deduction = (late_minutes_total / 60) × hourly_rate  (if enabled)
undertime_deduction = (undertime_minutes_total / 60) × hourly_rate  (if enabled)
absent_deduction = days_absent × daily_rate  (if enabled)
unpaid_leave_deduction = unpaid_leave_days × daily_rate

gross_pay = basic_pay + ot_pay + holiday_pay - late_deduction - undertime_deduction - absent_deduction - unpaid_leave_deduction

taxable_income = gross_pay - sss - philhealth - pagibig
withholding_tax = base_tax + (taxable_income - bracket_floor) × tax_rate

total_deductions = sss + philhealth + pagibig + withholding_tax + custom_deductions_total
net_pay = gross_pay - total_deductions
```

All values displayed in an editable form. Admin can manually adjust any field. Save button.

**Step 4: Finalize**
Back on `/payroll/process`:
- "Finalize Payroll" button — marks all entries as 'finalized', period as 'completed'
- Export button (CSV / PDF) — full payroll summary
- "Mark as Credited" — bulk or per-employee toggle

---

## 7. Payslip

### 7.1 In-App View

Breakdown table showing:
- Earnings: basic pay, OT pay, holiday pay
- Deductions: late, undertime, absent, unpaid leave, SSS, PhilHealth, Pag-IBIG, tax, custom
- Totals: gross, total deductions, net pay
- Period dates, pay date, bank credit status

### 7.2 PDF Download

Generated client-side using printable HTML (same pattern as existing PDF export). Formatted as a standard PH payslip with company name, employee name, period, breakdown, signatures line.

---

## 8. Routes Summary

| Route | Roles | Description |
|-------|-------|-------------|
| `/payroll` | all | My Payroll + All Members tabs |
| `/payroll/process` | admin, hr, business_manager, director | Process payroll — period + readiness |
| `/payroll/process/[profileId]` | admin, hr, business_manager, director | Per-employee payroll detail |
| `/settings/payroll` | admin | Payroll settings |

---

## 9. RLS Policies

All new tables follow company isolation pattern:
- `payroll_settings`: admin only
- `payroll_periods`: admin/HR read + manage
- `payroll_entries`: admin/HR/BM/director see all, member sees own
- `payroll_custom_deductions`: same as payroll_entries
- `custom_deduction_types`: admin manage, all read
- `recurring_deductions`: admin/HR manage, member sees own
- `ph_contribution_tables`: admin manage, all read
- `ph_tax_brackets`: admin manage, all read

---

## 10. Navigation

- Add "Payroll" to sidebar (between Overtime and Approvals)
- Add `/settings/payroll` to settings nav tabs
- Add to bottom tabs for mobile
