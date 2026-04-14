CREATE TABLE employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  work_type TEXT CHECK (work_type IN ('full_time', 'part_time')) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  work_days TEXT[] NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_employee_schedules_company_id ON employee_schedules(company_id);

CREATE TRIGGER employee_schedules_updated_at
  BEFORE UPDATE ON employee_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
