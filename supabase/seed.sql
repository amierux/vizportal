-- This seed creates default roles and job levels for a company.
-- Run after creating a company record.
-- In production, this is done via a Supabase Edge Function or server action
-- triggered on company creation.

-- Seed function: call with a company_id to populate defaults
CREATE OR REPLACE FUNCTION seed_company_defaults(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Default roles
  INSERT INTO roles (company_id, name, description) VALUES
    (p_company_id, 'admin', 'Full system access, all settings'),
    (p_company_id, 'hr', 'Employee management, attendance/leave oversight'),
    (p_company_id, 'director', 'Company-level oversight'),
    (p_company_id, 'business_manager', 'Operational oversight'),
    (p_company_id, 'dept_manager', 'Department-level approvals and views'),
    (p_company_id, 'team_leader', 'Team-level approvals'),
    (p_company_id, 'member', 'Regular employee');

  -- Default job levels
  INSERT INTO job_levels (company_id, code, name, rank) VALUES
    (p_company_id, 'A1', 'Entry Level', 1),
    (p_company_id, 'A2', 'Associate', 2),
    (p_company_id, 'B1', 'Mid Level', 3),
    (p_company_id, 'B2', 'Senior', 4),
    (p_company_id, 'B3', 'Lead', 5),
    (p_company_id, 'C1', 'Specialist', 6),
    (p_company_id, 'C2', 'Senior Specialist', 7),
    (p_company_id, 'D1', 'Manager', 8),
    (p_company_id, 'D2', 'Senior Manager', 9),
    (p_company_id, 'D3', 'Business Manager', 10),
    (p_company_id, 'DR', 'Director', 11);
END;
$$ LANGUAGE plpgsql;
