ALTER TABLE leave_types ADD COLUMN requires_reliever BOOLEAN DEFAULT false NOT NULL;

CREATE TABLE leave_request_relievers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE NOT NULL,
  reliever_id UUID REFERENCES profiles(id) NOT NULL,
  tasks TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_leave_request_relievers_request ON leave_request_relievers(leave_request_id);
CREATE INDEX idx_leave_request_relievers_reliever ON leave_request_relievers(reliever_id);

ALTER TABLE leave_request_relievers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own request relievers"
  ON leave_request_relievers FOR SELECT
  USING (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Relievers can view assigned relievers"
  ON leave_request_relievers FOR SELECT
  USING (reliever_id = auth.uid());

CREATE POLICY "Admin/HR can view all relievers"
  ON leave_request_relievers FOR SELECT
  USING (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE company_id = get_user_company_id()
    )
    AND has_any_role(ARRAY['admin', 'hr'])
  );

CREATE POLICY "Users can insert own request relievers"
  ON leave_request_relievers FOR INSERT
  WITH CHECK (
    leave_request_id IN (
      SELECT id FROM leave_requests WHERE profile_id = auth.uid()
    )
  );
