-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "Admin can update company"
  ON companies FOR UPDATE
  USING (id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Admin/HR can view all profiles in company"
  ON profiles FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr', 'director', 'business_manager']));

CREATE POLICY "Dept managers can view own department profiles"
  ON profiles FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admin/HR can update any profile in company"
  ON profiles FOR UPDATE
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Admin/HR can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- ROLES
-- ============================================================
CREATE POLICY "Users can view roles in company"
  ON roles FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage roles"
  ON roles FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

-- ============================================================
-- USER_ROLES
-- ============================================================
CREATE POLICY "Admin/HR can view all user_roles in company"
  ON user_roles FOR SELECT
  USING (
    has_any_role(ARRAY['admin', 'hr'])
    AND profile_id IN (SELECT id FROM profiles WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can manage user_roles"
  ON user_roles FOR ALL
  USING (
    has_any_role(ARRAY['admin', 'hr'])
    AND profile_id IN (SELECT id FROM profiles WHERE company_id = get_user_company_id())
  );

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE POLICY "Users can view departments in company"
  ON departments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin/HR can manage departments"
  ON departments FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- JOB_LEVELS
-- ============================================================
CREATE POLICY "Users can view job_levels in company"
  ON job_levels FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage job_levels"
  ON job_levels FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

-- ============================================================
-- EMPLOYEE_DETAILS
-- ============================================================
CREATE POLICY "Admin/HR can view all employee_details"
  ON employee_details FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Dept managers/TL can view own dept employee_details"
  ON employee_details FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND department_id = get_user_department_id()
  );

CREATE POLICY "Users can view own employee_details"
  ON employee_details FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can update all employee_details"
  ON employee_details FOR UPDATE
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can update own personal fields"
  ON employee_details FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin/HR can insert employee_details"
  ON employee_details FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

-- ============================================================
-- EMPLOYEE_DOCUMENTS
-- ============================================================
CREATE POLICY "Admin/HR can view all documents in company"
  ON employee_documents FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can view own documents"
  ON employee_documents FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin/HR can manage documents"
  ON employee_documents FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can upload own documents"
  ON employee_documents FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND company_id = get_user_company_id());

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE POLICY "Admin/HR can view invitations"
  ON invitations FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Admin/HR can manage invitations"
  ON invitations FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));
