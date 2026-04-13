-- Returns the current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Checks if the current user has a specific role in their company
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.profile_id = auth.uid()
    AND r.name = role_name
    AND r.company_id = get_user_company_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Checks if the current user has any of the given roles
CREATE OR REPLACE FUNCTION has_any_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.profile_id = auth.uid()
    AND r.name = ANY(role_names)
    AND r.company_id = get_user_company_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the department_id of the current user
CREATE OR REPLACE FUNCTION get_user_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM employee_details WHERE profile_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
