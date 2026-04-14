-- Extend the seed function to include default leave types and settings
CREATE OR REPLACE FUNCTION seed_company_leave_defaults(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Default PH statutory leave types
  INSERT INTO leave_types (company_id, name, code, default_days, is_paid, applicable_gender, requires_attachment, is_carry_over, max_carry_over_days) VALUES
    (p_company_id, 'Vacation Leave', 'VL', 5, true, 'all', false, true, 5),
    (p_company_id, 'Sick Leave', 'SL', 5, true, 'all', false, false, 0),
    (p_company_id, 'Maternity Leave', 'ML', 105, true, 'female', true, false, 0),
    (p_company_id, 'Paternity Leave', 'PL', 7, true, 'male', false, false, 0),
    (p_company_id, 'Solo Parent Leave', 'SPL', 7, true, 'all', false, false, 0),
    (p_company_id, 'VAWC Leave', 'VAWC', 10, true, 'female', true, false, 0),
    (p_company_id, 'Special Leave for Women', 'SLW', 60, true, 'female', true, false, 0);

  -- Default leave settings (reset Jan 1)
  INSERT INTO leave_settings (company_id, reset_month, reset_day)
  VALUES (p_company_id, 1, 1)
  ON CONFLICT (company_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
