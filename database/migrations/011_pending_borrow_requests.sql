ALTER TABLE loans
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE loans
SET released_at = COALESCE(released_at, borrowed_at)
WHERE status = 'Active';

ALTER TABLE loans
  DROP CONSTRAINT IF EXISTS loans_status_check;

ALTER TABLE loans
  ADD CONSTRAINT loans_status_check
  CHECK (status IN ('pending', 'Active', 'Returned', 'Rejected'));
