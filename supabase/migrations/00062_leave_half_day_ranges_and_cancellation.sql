-- Replace single half_day_period with start/end half-day markers for flexible ranges.
-- Example: "leave from Mon afternoon to Wed morning" → start_half='pm', end_half='am',
-- counting Mon PM (0.5) + Tue full (1) + Wed AM (0.5) = 2 days.

ALTER TABLE leave_requests
  DROP COLUMN IF EXISTS half_day_period;

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS start_half TEXT
    CHECK (start_half IN ('am', 'pm')),
  ADD COLUMN IF NOT EXISTS end_half TEXT
    CHECK (end_half IN ('am', 'pm'));

-- Cancellation request flow: a filed or approved leave can be asked to be
-- cancelled; cancellation goes through the approval chain (type='leave_cancellation'
-- in approval_requests). When approved: leave status -> 'cancelled' and balance
-- is refunded (only if the leave was previously approved).
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_approval_id UUID;
