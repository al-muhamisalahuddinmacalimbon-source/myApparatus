CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Borrow requests/loan slips
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS subject_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS endorsement_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS instructor_endorsed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS endorsement_method TEXT,
  ADD COLUMN IF NOT EXISTS instructor_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS endorsed_at TIMESTAMPTZ;

-- Shared-machine reservation requests
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS subject_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS endorsement_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS instructor_endorsed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS endorsement_method TEXT,
  ADD COLUMN IF NOT EXISTS instructor_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS endorsed_at TIMESTAMPTZ;
