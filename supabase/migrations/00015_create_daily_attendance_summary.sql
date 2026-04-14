CREATE TABLE daily_attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  date DATE NOT NULL,
  total_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  required_hours DECIMAL(5,2) NOT NULL,
  is_late BOOLEAN DEFAULT false NOT NULL,
  late_minutes INTEGER DEFAULT 0 NOT NULL,
  is_early_out BOOLEAN DEFAULT false NOT NULL,
  early_out_minutes INTEGER DEFAULT 0 NOT NULL,
  is_undertime BOOLEAN DEFAULT false NOT NULL,
  undertime_minutes INTEGER DEFAULT 0 NOT NULL,
  overtime_minutes INTEGER DEFAULT 0 NOT NULL,
  has_missing_entry BOOLEAN DEFAULT false NOT NULL,
  status TEXT CHECK (status IN ('present', 'late', 'absent', 'half_day', 'on_leave')) DEFAULT 'absent' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(profile_id, date)
);

CREATE INDEX idx_daily_attendance_summary_company_id ON daily_attendance_summary(company_id);
CREATE INDEX idx_daily_attendance_summary_profile_date ON daily_attendance_summary(profile_id, date);

CREATE TRIGGER daily_attendance_summary_updated_at
  BEFORE UPDATE ON daily_attendance_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
