CREATE TABLE workspace_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE workspace_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates"
  ON workspace_checklist_templates FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage templates"
  ON workspace_checklist_templates FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE TABLE workspace_list_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE workspace_list_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view list templates"
  ON workspace_list_templates FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage list templates"
  ON workspace_list_templates FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));
