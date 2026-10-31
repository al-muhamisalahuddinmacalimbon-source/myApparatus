-- Adds eight sample active loans to the two sample loans in 001_seed.sql.
-- Run after database/migrations/001_init.sql and database/seeds/001_seed.sql.
-- The fixed borrower timestamps make this seed safe to rerun.
WITH sample_loans (
  student_id,
  apparatus_id,
  borrowed_at,
  due_at
) AS (
  VALUES
    ('2023-0003', 2,  '2026-10-25 08:00:00+08'::timestamptz, '2026-10-30 08:00:00+08'::timestamptz),
    ('2023-0004', 3,  '2026-10-26 08:00:00+08'::timestamptz, '2026-11-02 08:00:00+08'::timestamptz),
    ('2023-0005', 4,  '2026-10-27 08:00:00+08'::timestamptz, '2026-10-31 08:00:00+08'::timestamptz),
    ('2024-0053', 5,  '2026-10-28 08:00:00+08'::timestamptz, '2026-11-03 08:00:00+08'::timestamptz),
    ('2023-0006', 6,  '2026-10-29 08:00:00+08'::timestamptz, '2026-11-05 08:00:00+08'::timestamptz),
    ('2023-0007', 8,  '2026-10-30 08:00:00+08'::timestamptz, '2026-11-06 08:00:00+08'::timestamptz),
    ('2023-0008', 9,  '2026-10-30 09:00:00+08'::timestamptz, '2026-11-07 09:00:00+08'::timestamptz),
    ('2023-0009', 11, '2026-10-30 10:00:00+08'::timestamptz, '2026-11-08 10:00:00+08'::timestamptz)
),
inserted_loans AS (
  INSERT INTO loans (student_id, borrowed_at, due_at, status)
  SELECT s.student_id, s.borrowed_at, s.due_at, 'Active'
  FROM sample_loans s
  WHERE (SELECT COUNT(*) FROM loans WHERE status = 'Active') <= 2
    AND NOT EXISTS (
      SELECT 1
      FROM loans l
      WHERE l.student_id = s.student_id
        AND l.borrowed_at = s.borrowed_at
    )
  RETURNING id, student_id, borrowed_at
),
inserted_items AS (
  INSERT INTO loan_items (loan_id, apparatus_id, quantity)
  SELECT l.id, s.apparatus_id, 1
  FROM inserted_loans l
  JOIN sample_loans s
    ON s.student_id = l.student_id
   AND s.borrowed_at = l.borrowed_at
  RETURNING apparatus_id, quantity
)
UPDATE apparatus a
SET available_stock = a.available_stock - stock_changes.quantity
FROM (
  SELECT apparatus_id, SUM(quantity)::integer AS quantity
  FROM inserted_items
  GROUP BY apparatus_id
) stock_changes
WHERE a.id = stock_changes.apparatus_id;
