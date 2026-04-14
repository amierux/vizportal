CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft' NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_public BOOLEAN DEFAULT false NOT NULL,
  public_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  approval_enabled BOOLEAN DEFAULT false NOT NULL,
  save_to_list_enabled BOOLEAN DEFAULT false NOT NULL,
  target_list_id UUID REFERENCES workspace_lists(id),
  schedule_enabled BOOLEAN DEFAULT false NOT NULL,
  schedule_cron TEXT,
  schedule_target TEXT CHECK (schedule_target IN ('all_employees', 'department', 'specific')),
  schedule_target_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_forms_company ON forms(company_id);
CREATE INDEX idx_forms_public_token ON forms(public_token);

CREATE TRIGGER forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can view all forms"
  ON forms FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can view published forms"
  ON forms FOR SELECT
  USING (company_id = get_user_company_id() AND status = 'published');

CREATE POLICY "Admin can manage forms"
  ON forms FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE TABLE form_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  condition JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_form_sections_form ON form_sections(form_id);

ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form sections"
  ON form_sections FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()));

CREATE POLICY "Admin can manage form sections"
  ON form_sections FOR ALL
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_role('admin'));

CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES form_sections(id) ON DELETE CASCADE NOT NULL,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'number', 'date', 'textarea', 'select', 'multi_select', 'checkbox', 'radio', 'file', 'signature', 'email', 'phone', 'calculated')) NOT NULL,
  position INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT false NOT NULL,
  placeholder TEXT,
  help_text TEXT,
  options JSONB DEFAULT '[]',
  validation_rules JSONB DEFAULT '{}',
  conditional_logic JSONB DEFAULT '{}',
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_form_fields_section ON form_fields(section_id);
CREATE INDEX idx_form_fields_form ON form_fields(form_id);

ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form fields"
  ON form_fields FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()));

CREATE POLICY "Admin can manage form fields"
  ON form_fields FOR ALL
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_role('admin'));
