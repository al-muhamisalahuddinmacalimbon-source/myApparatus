-- Persistent notices published by laboratory staff for students.

CREATE TABLE IF NOT EXISTS lab_notices (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL CHECK (length(trim(title)) > 0),
  category    VARCHAR(20) NOT NULL
              CHECK (category IN ('Schedule', 'Safety', 'Announcements')),
  body        TEXT NOT NULL CHECK (length(trim(body)) > 0),
  pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_notices_order
  ON lab_notices (pinned DESC, created_at DESC);
