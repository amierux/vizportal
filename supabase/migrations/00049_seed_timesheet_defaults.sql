CREATE OR REPLACE FUNCTION seed_company_timesheet_defaults(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_config_id UUID;
BEGIN
  INSERT INTO timesheet_settings (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  INSERT INTO timesheet_approval_configs (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING
  RETURNING id INTO v_config_id;

  IF v_config_id IS NOT NULL THEN
    INSERT INTO timesheet_approval_steps (timesheet_approval_config_id, step_order, role, is_optional) VALUES
      (v_config_id, 1, 'team_leader', false);
  END IF;
END;
$$ LANGUAGE plpgsql;
