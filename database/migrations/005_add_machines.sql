ALTER TABLE machines
  DROP CONSTRAINT IF EXISTS machines_status_check;

ALTER TABLE machines
  ALTER COLUMN status TYPE VARCHAR(20);

UPDATE machines
SET status = CASE status
  WHEN 'Active' THEN 'available'
  WHEN 'Inactive' THEN 'archived'
  ELSE status
END;

ALTER TABLE machines
  ALTER COLUMN status SET DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS model VARCHAR(120),
  ADD COLUMN IF NOT EXISTS specifications TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD CONSTRAINT machines_status_check
    CHECK (status IN ('available', 'in_use', 'maintenance', 'archived'));

CREATE INDEX IF NOT EXISTS idx_machines_status ON machines (status);
