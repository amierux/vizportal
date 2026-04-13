CREATE TABLE employee_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  department_id UUID REFERENCES departments(id),
  job_level_id UUID REFERENCES job_levels(id),
  job_position TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  date_of_birth DATE,
  phone_number TEXT,
  address_line TEXT,
  city TEXT,
  province TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'Philippines',
  tin_number TEXT,
  sss_number TEXT,
  philhealth_number TEXT,
  pagibig_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  weekly_required_hours DECIMAL(5,2) DEFAULT 40.00 NOT NULL,
  salary DECIMAL(12,2),
  salary_frequency TEXT CHECK (salary_frequency IN ('monthly', 'semi_monthly', 'weekly')),
  date_hired DATE,
  date_regularized DATE,
  employment_status TEXT CHECK (employment_status IN ('probationary', 'regular', 'resigned', 'terminated')) DEFAULT 'probationary' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_employee_details_profile_id ON employee_details(profile_id);
CREATE INDEX idx_employee_details_company_id ON employee_details(company_id);
CREATE INDEX idx_employee_details_department_id ON employee_details(department_id);

CREATE TRIGGER employee_details_updated_at
  BEFORE UPDATE ON employee_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
