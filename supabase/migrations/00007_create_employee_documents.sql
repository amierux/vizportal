CREATE TABLE employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_employee_documents_profile_id ON employee_documents(profile_id);
CREATE INDEX idx_employee_documents_company_id ON employee_documents(company_id);

CREATE TRIGGER employee_documents_updated_at
  BEFORE UPDATE ON employee_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
