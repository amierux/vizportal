-- Add half-day support to leave_requests.
-- NULL = full day leave. 'am' = morning half, 'pm' = afternoon half.
-- When set, start_date and end_date must be the same day, and total_days = 0.5.

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS half_day_period TEXT
    CHECK (half_day_period IN ('am', 'pm'));
