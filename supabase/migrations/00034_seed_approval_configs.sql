CREATE OR REPLACE FUNCTION seed_company_approval_configs(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_manual_config_id UUID;
  v_leave_config_id UUID;
  v_overtime_config_id UUID;
BEGIN
  -- Manual clock approval
  INSERT INTO approval_configs (company_id, type, is_enabled)
  VALUES (p_company_id, 'manual_clock', true)
  ON CONFLICT (company_id, type) DO NOTHING
  RETURNING id INTO v_manual_config_id;

  IF v_manual_config_id IS NOT NULL THEN
    INSERT INTO approval_config_steps (approval_config_id, step_order, role, is_optional) VALUES
      (v_manual_config_id, 1, 'team_leader', false),
      (v_manual_config_id, 2, 'dept_manager', false);
  END IF;

  -- Leave approval
  INSERT INTO approval_configs (company_id, type, is_enabled)
  VALUES (p_company_id, 'leave_request', true)
  ON CONFLICT (company_id, type) DO NOTHING
  RETURNING id INTO v_leave_config_id;

  IF v_leave_config_id IS NOT NULL THEN
    INSERT INTO approval_config_steps (approval_config_id, step_order, role, is_optional) VALUES
      (v_leave_config_id, 1, 'reliever', false),
      (v_leave_config_id, 2, 'team_leader', false),
      (v_leave_config_id, 3, 'dept_manager', false);
  END IF;

  -- Overtime approval
  INSERT INTO approval_configs (company_id, type, is_enabled)
  VALUES (p_company_id, 'overtime', true)
  ON CONFLICT (company_id, type) DO NOTHING
  RETURNING id INTO v_overtime_config_id;

  IF v_overtime_config_id IS NOT NULL THEN
    INSERT INTO approval_config_steps (approval_config_id, step_order, role, is_optional) VALUES
      (v_overtime_config_id, 1, 'team_leader', false),
      (v_overtime_config_id, 2, 'dept_manager', false),
      (v_overtime_config_id, 3, 'business_manager', true),
      (v_overtime_config_id, 4, 'director', true);
  END IF;
END;
$$ LANGUAGE plpgsql;
