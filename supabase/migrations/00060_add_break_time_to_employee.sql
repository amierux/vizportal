-- Add optional lunch/break time to employee_details.
-- When break_enabled is true, the minutes between break_start_time and break_end_time
-- are deducted from the day's total_hours in attendance calculation.

ALTER TABLE employee_details
  ADD COLUMN IF NOT EXISTS break_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS break_start_time TIME,
  ADD COLUMN IF NOT EXISTS break_end_time TIME;
