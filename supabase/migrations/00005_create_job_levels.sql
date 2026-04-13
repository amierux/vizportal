CREATE TABLE job_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE INDEX idx_job_levels_company_id ON job_levels(company_id);
