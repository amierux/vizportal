CREATE TABLE overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_overtime_requests_company_id ON overtime_requests(company_id);
CREATE INDEX idx_overtime_requests_profile_id ON overtime_requests(profile_id);
CREATE INDEX idx_overtime_requests_profile_date ON overtime_requests(profile_id, date);

CREATE TRIGGER overtime_requests_updated_at
  BEFORE UPDATE ON overtime_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can view all overtime requests"
  ON overtime_requests FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "TL/DM can view own dept overtime requests"
  ON overtime_requests FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['dept_manager', 'team_leader'])
    AND profile_id IN (
      SELECT ed.profile_id FROM employee_details ed
      WHERE ed.department_id = get_user_department_id()
    )
  );

CREATE POLICY "Users can view own overtime requests"
  ON overtime_requests FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own overtime requests"
  ON overtime_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Users can update own pending overtime requests"
  ON overtime_requests FOR UPDATE
  USING (profile_id = auth.uid() AND status = 'pending')
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin/HR can update overtime requests"
  ON overtime_requests FOR UPDATE
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));
