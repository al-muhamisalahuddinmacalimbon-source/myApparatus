-- Demo technician accounts. Run after database/migrations/001_init.sql.
-- The password for every mock staff account is 123.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO admins (username, password_hash) VALUES
  ('Marilou Legaspi', crypt('123', gen_salt('bf')))
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;
