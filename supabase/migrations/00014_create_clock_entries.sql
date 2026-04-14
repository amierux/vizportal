CREATE TABLE clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('clock_in', 'clock_out')) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  selfie_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  is_manual BOOLEAN DEFAULT false NOT NULL,
  manual_remarks TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_clock_entries_company_id ON clock_entries(company_id);
CREATE INDEX idx_clock_entries_profile_id ON clock_entries(profile_id);
CREATE INDEX idx_clock_entries_profile_date ON clock_entries(profile_id, date);
