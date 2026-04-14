# Online Forms — Cycle 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a drag-and-drop form builder with 13 field types, conditional logic (show/hide, skip, required-if, calculated), approval workflow, public forms, scheduled distribution, save-to-workspace-list, and submission management.

**Architecture:** 7 new database tables for form definitions, sections, fields, submissions, assignments, and approval. Form builder is a client-heavy three-panel UI (palette, preview, properties). Conditional logic evaluated client-side. Submissions stored as JSONB. File/signature uploads to Supabase Storage. Approval reuses the configurable chain pattern. Distribution cron for scheduled forms.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth, Storage), Tailwind + shadcn/ui, Zod, recharts

**Spec:** `docs/superpowers/specs/2026-04-14-phase5-forms-dashboard-design.md` — Sections 2-7

---

## File Structure

```
vizportal/
├── supabase/migrations/
│   ├── 00050_create_forms.sql
│   ├── 00051_create_form_submissions.sql
│   └── 00052_create_form_approvals.sql
├── src/
│   ├── app/(portal)/
│   │   ├── forms/
│   │   │   ├── page.tsx                              # Form management (admin)
│   │   │   ├── my-forms/page.tsx                     # My assigned forms
│   │   │   ├── builder/[formId]/page.tsx             # Form builder
│   │   │   └── [formId]/submissions/page.tsx         # View submissions
│   │   └── settings/forms/page.tsx                   # Form settings
│   ├── app/forms/public/[token]/page.tsx             # Public form (outside portal)
│   ├── app/api/cron/form-distribution/route.ts       # Scheduled distribution
│   ├── components/
│   │   └── forms/
│   │       ├── form-builder.tsx                      # Main builder component
│   │       ├── field-palette.tsx                     # Left panel — field types
│   │       ├── form-preview.tsx                      # Center panel — live preview
│   │       ├── field-properties.tsx                  # Right panel — field config
│   │       ├── conditional-logic-editor.tsx          # Logic editor UI
│   │       ├── form-renderer.tsx                     # Renders form for filling
│   │       ├── form-list-table.tsx                   # Admin form list
│   │       ├── my-forms-list.tsx                     # User's assigned forms
│   │       ├── submissions-table.tsx                 # View submissions
│   │       ├── submission-detail.tsx                 # Single submission view
│   │       ├── form-settings-panel.tsx               # Builder settings tab
│   │       └── signature-pad.tsx                     # Signature capture
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── forms.ts                             # Form CRUD
│   │   │   ├── form-submissions.ts                  # Submission handling
│   │   │   └── form-builder.ts                      # Builder-specific actions
│   │   └── validations/
│   │       └── forms.ts                             # Zod schemas
│   └── types/
│       ├── database.ts                              # MODIFY — 7 new tables
│       └── index.ts                                 # MODIFY
```

---

## Task 1: Database Migrations

**Files:** Create 3 migration files

- [ ] **Step 1: Create migration 00050 — forms + sections + fields**

Create `vizportal/supabase/migrations/00050_create_forms.sql`:

```sql
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
```

- [ ] **Step 2: Create migration 00051 — submissions + assignments**

Create `vizportal/supabase/migrations/00051_create_form_submissions.sql`:

```sql
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  submitted_by UUID REFERENCES profiles(id),
  respondent_name TEXT,
  respondent_email TEXT,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'submitted' NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  saved_to_list BOOLEAN DEFAULT false NOT NULL,
  workspace_task_id UUID REFERENCES workspace_tasks(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_user ON form_submissions(submitted_by);

CREATE TRIGGER form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR can view all submissions"
  ON form_submissions FOR SELECT
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Users can view own submissions"
  ON form_submissions FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can insert submissions"
  ON form_submissions FOR INSERT
  WITH CHECK (company_id = get_user_company_id() OR submitted_by IS NULL);

CREATE POLICY "Admin can manage submissions"
  ON form_submissions FOR ALL
  USING (company_id = get_user_company_id() AND has_any_role(ARRAY['admin', 'hr']));

CREATE TABLE form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX idx_form_assignments_form ON form_assignments(form_id);
CREATE INDEX idx_form_assignments_profile ON form_assignments(profile_id);

ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments"
  ON form_assignments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admin can view all assignments"
  ON form_assignments FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_any_role(ARRAY['admin', 'hr']));

CREATE POLICY "Admin can manage assignments"
  ON form_assignments FOR ALL
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_role('admin'));
```

- [ ] **Step 3: Create migration 00052 — form approval configs**

Create `vizportal/supabase/migrations/00052_create_form_approvals.sql`:

```sql
CREATE TABLE form_approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER form_approval_configs_updated_at
  BEFORE UPDATE ON form_approval_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE form_approval_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view form approval configs"
  ON form_approval_configs FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()));

CREATE POLICY "Admin can manage form approval configs"
  ON form_approval_configs FOR ALL
  USING (form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id()) AND has_role('admin'));

CREATE TABLE form_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_approval_config_id UUID REFERENCES form_approval_configs(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE form_approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form approval steps"
  ON form_approval_steps FOR SELECT
  USING (
    form_approval_config_id IN (
      SELECT id FROM form_approval_configs WHERE form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id())
    )
  );

CREATE POLICY "Admin can manage form approval steps"
  ON form_approval_steps FOR ALL
  USING (
    form_approval_config_id IN (
      SELECT id FROM form_approval_configs WHERE form_id IN (SELECT id FROM forms WHERE company_id = get_user_company_id())
    )
    AND has_role('admin')
  );
```

- [ ] **Step 4: Push migrations + commit**

```bash
npx supabase db push
git add supabase/migrations/
git commit -m "feat: add forms migrations — forms, sections, fields, submissions, assignments, approvals"
```

---

## Task 2: Types + Routes + Navigation

**Files:** Modify types, constants, header, sidebar, settings nav

- [ ] **Step 1: Add 7 table types to database.ts + aliases to index.ts**

Types: `forms`, `form_sections`, `form_fields`, `form_submissions`, `form_assignments`, `form_approval_configs`, `form_approval_steps`

Aliases: `Form`, `FormSection`, `FormField`, `FormSubmission`, `FormAssignment`, `FormApprovalConfig`, `FormApprovalStep`

- [ ] **Step 2: Add routes, titles, navigation**

Routes: `/forms`, `/forms/my-forms`, `/settings/forms`
Sidebar: "Forms" with `FileText` icon before Workspace
Settings nav: "Forms" tab
Update proxy.ts: add `/forms/public/` to PUBLIC_ROUTES

- [ ] **Step 3: Verify build + commit**

---

## Task 3: Form CRUD Server Actions + Validations

**Files:** Create `src/lib/validations/forms.ts`, `src/lib/actions/forms.ts`, `src/lib/actions/form-builder.ts`

Validations: formSchema (name required), fieldSchema, sectionSchema

forms.ts actions: createForm, getForms, getForm (with sections+fields), updateForm, publishForm, archiveForm, deleteForm, assignForm(formId, profileIds), getFormAssignments, getFormByPublicToken

form-builder.ts actions: addSection, updateSection, deleteSection, reorderSections, addField, updateField, deleteField, reorderFields, updateFormSettings (approval, save-to-list, schedule, public toggle)

- [ ] **Step 1: Create all 3 files**
- [ ] **Step 2: Verify build + commit**

---

## Task 4: Form Submission Actions

**Files:** Create `src/lib/actions/form-submissions.ts`

Actions: submitForm(formId, data, files?), getFormSubmissions(formId), getSubmission(submissionId), getMyFormSubmissions, getMyAssignedForms, approveSubmission(id, comment), rejectSubmission(id, comment)

Submit flow: validate required fields, upload files to storage, store data as JSONB, if save_to_list create workspace task, if approval_enabled trigger chain, mark assignment completed.

- [ ] **Step 1: Create submission actions**
- [ ] **Step 2: Verify build + commit**

---

## Task 5: Form Builder UI

**Files:** Create 6 components in `src/components/forms/`

1. `form-builder.tsx` — Main builder layout: 3 panels + settings tab. Manages form state client-side.
2. `field-palette.tsx` — Left panel: 13 field type cards. Click adds field to current section.
3. `form-preview.tsx` — Center panel: renders sections + fields in order. Click to select. Shows section headers.
4. `field-properties.tsx` — Right panel: label, name, type, required, placeholder, help text, options editor (for select/radio), validation rules.
5. `conditional-logic-editor.tsx` — Sub-panel: visibility condition builder (field + operator + value dropdowns), required-if, calculated formula builder.
6. `form-settings-panel.tsx` — Settings tab: name, description, approval toggle + chain editor, save-to-list toggle + list selector, public link toggle, schedule config.

- [ ] **Step 1: Create all 6 builder components**
- [ ] **Step 2: Verify build + lint + commit**

---

## Task 6: Form Renderer + Signature Pad

**Files:** Create `form-renderer.tsx`, `signature-pad.tsx`

form-renderer.tsx: Renders a form for filling. Takes form definition (sections, fields) + handles conditional logic client-side. Evaluates visibility/required-if/skip conditions. Calculates calculated fields. File upload handling. Validates on submit.

signature-pad.tsx: HTML5 Canvas signature capture. Draw with mouse/touch. Clear button. Returns base64 PNG on save.

- [ ] **Step 1: Create both components**
- [ ] **Step 2: Verify build + commit**

---

## Task 7: Form Management + My Forms Components

**Files:** Create `form-list-table.tsx`, `my-forms-list.tsx`, `submissions-table.tsx`, `submission-detail.tsx`

1. form-list-table.tsx — Admin table: name, status badge, submissions count, created date, actions (edit/publish/archive/assign/view submissions). Create button.
2. my-forms-list.tsx — User's assigned forms: form name, assigned date, status (pending/completed). Click opens form renderer.
3. submissions-table.tsx — Per-form submissions: respondent, date, status, view button. Export CSV/PDF.
4. submission-detail.tsx — Single submission: formatted field labels + values, approval status, files/signatures displayed.

- [ ] **Step 1: Create all 4 components**
- [ ] **Step 2: Verify build + lint + commit**

---

## Task 8: Form Pages

**Files:** Create 5 pages + 1 public page

1. `/forms/page.tsx` — Admin form management
2. `/forms/my-forms/page.tsx` — User's assigned forms + own submissions
3. `/forms/builder/[formId]/page.tsx` — Form builder
4. `/forms/[formId]/submissions/page.tsx` — View submissions
5. `/settings/forms/page.tsx` — Form settings (placeholder — just shows form defaults info)
6. `/forms/public/[token]/page.tsx` — Public form (outside portal, no login)

- [ ] **Step 1: Create all 6 pages**
- [ ] **Step 2: Verify build + lint + commit**

---

## Task 9: Form Distribution Cron

**Files:** Create `src/app/api/cron/form-distribution/route.ts`, update `vercel.json`

Cron: daily at 9AM. Checks forms where schedule_enabled = true. Parses schedule_cron. If today matches, creates form_assignments for targets. Sends notifications.

vercel.json: add `{ "path": "/api/cron/form-distribution", "schedule": "0 1 * * *" }`

- [ ] **Step 1: Create cron route + update vercel.json**
- [ ] **Step 2: Verify build + commit**

---

## Task 10: Final Integration + Deploy

- [ ] **Step 1: Full verification**
```bash
npm test && npm run build && npm run lint
```

- [ ] **Step 2: Push migrations**
```bash
npx supabase db push
```

- [ ] **Step 3: Deploy**
```bash
npx vercel --prod --yes
```
