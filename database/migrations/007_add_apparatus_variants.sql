CREATE TABLE IF NOT EXISTS apparatus_variants (
  id               SERIAL       PRIMARY KEY,
  apparatus_id     INTEGER      NOT NULL REFERENCES apparatus(id) ON DELETE CASCADE,
  name             VARCHAR(120) NOT NULL,
  total_stock      INTEGER      NOT NULL CHECK (total_stock >= 0),
  available_stock  INTEGER      NOT NULL CHECK (available_stock >= 0),
  status           VARCHAR(10)  NOT NULL DEFAULT 'Active'
                   CHECK (status IN ('Active', 'Inactive')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (available_stock <= total_stock),
  UNIQUE (apparatus_id, name)
);

ALTER TABLE loan_items
  ADD COLUMN IF NOT EXISTS variant_id INTEGER
  REFERENCES apparatus_variants(id);

CREATE INDEX IF NOT EXISTS idx_apparatus_variants_parent
  ON apparatus_variants (apparatus_id);

CREATE INDEX IF NOT EXISTS idx_loan_items_variant
  ON loan_items (variant_id);

CREATE OR REPLACE VIEW active_loans_view AS
SELECT
  l.id AS loan_id,
  s.student_id,
  s.full_name,
  string_agg(
    a.name
      || CASE WHEN v.id IS NULL THEN '' ELSE ' (' || v.name || ')' END
      || ' x' || (li.quantity - li.returned_quantity)::text,
    ', ' ORDER BY a.name, v.name
  ) AS items,
  l.borrowed_at,
  l.due_at,
  CASE WHEN l.due_at < NOW() THEN 'Overdue' ELSE 'Active' END AS status
FROM loans l
JOIN students s ON s.student_id = l.student_id
JOIN loan_items li ON li.loan_id = l.id
JOIN apparatus a ON a.id = li.apparatus_id
LEFT JOIN apparatus_variants v ON v.id = li.variant_id
WHERE l.status = 'Active'
  AND li.quantity > li.returned_quantity
GROUP BY l.id, s.student_id, s.full_name, l.borrowed_at, l.due_at;
