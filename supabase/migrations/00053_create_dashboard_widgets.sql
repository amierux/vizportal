CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  widget_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  size TEXT CHECK (size IN ('small', 'medium', 'large')) DEFAULT 'small' NOT NULL,
  config JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_dashboard_widgets_profile ON dashboard_widgets(profile_id);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own widgets"
  ON dashboard_widgets FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own widgets"
  ON dashboard_widgets FOR ALL
  USING (profile_id = auth.uid());
