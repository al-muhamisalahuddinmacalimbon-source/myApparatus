BEGIN;

INSERT INTO students (student_id, full_name, course, year_level) VALUES
  ('2023-0001', 'Juan Dela Cruz', 'BS Chemical Engineering', 3),
  ('2023-0002', 'Maria Santos', 'BS Electronics Engineering', 2),
  ('2023-0003', 'Ana Reyes', 'BS Mechanical Engineering', 4),
  ('2023-0004', 'Carlo Mendoza', 'BS Materials Engineering', 1),
  ('2023-0005', 'Liza Fernandez', 'BS Chemistry', 3),
  ('2024-0053', 'Al-Muhami M. Macalimbon', 'BS Computer Science', 2),
  ('2023-0006', 'Lance Sacay', 'BS Computer Science', 3),
  ('2023-0007', 'Sai Malubay', 'BS Materials Engineering', 3),
  ('2023-0008', 'Cosain Saleh', 'BS Civil Engineering', 3),
  ('2023-0009', 'Demos Maglasang', 'BS Electrical Engineering', 3),
  ('2023-0010', 'Theodore Megrenio', 'BS Mechanical Engineering', 3),
  ('2023-0011', 'Johnlord Galleto', 'BS Electronics Engineering', 3),
  ('2023-0012', 'Duke David Andre Paquit', 'BS Chemical Engineering', 3),
  ('2023-0013', 'John Marcuz Sembrano', 'BS Computer Engineering', 3)
ON CONFLICT (student_id) DO NOTHING;

WITH seed_apparatus (name, category, icon, total_stock, available_stock) AS (
  VALUES
    ('Beaker 250 mL',        'Glassware',   'flask-conical', 20, 20),
    ('Beaker 500 mL',        'Glassware',   'flask-conical', 15, 15),
    ('Erlenmeyer flask',     'Glassware',   'flask-round',   15, 15),
    ('Test tube set',        'Glassware',   'test-tube',     25, 25),
    ('Graduated cylinder',   'Glassware',   'flask-conical', 12, 12),
    ('Petri dish set',       'Glassware',   'circle',        10, 10),
    ('Multimeter',           'Electronics', 'gauge',          8,  8),
    ('Breadboard',           'Electronics', 'cpu',           12, 12),
    ('Oscilloscope probe',   'Electronics', 'activity',       6,  6),
    ('Soldering iron',       'Electronics', 'zap',            6,  6),
    ('DC power supply',      'Electronics', 'plug',           5,  5),
    ('Jumper wire kit',      'Electronics', 'cable',         15, 15),
    ('Vernier caliper',      'Tools',       'ruler',         10, 10),
    ('Screwdriver set',      'Tools',       'wrench',         8,  8),
    ('Digital scale',        'Tools',       'scale',          5,  5),
    ('Tongs',                'Tools',       'wrench',        10, 10),
    ('Thermometer',          'Tools',       'thermometer',   12, 12),
    ('Hot plate',            'Tools',       'flame',          6,  6),
    ('Safety goggles',       'Safety',      'glasses',       30, 30),
    ('Lab gloves (box)',     'Safety',      'hand',          10, 10)
)
INSERT INTO apparatus (name, category, icon, total_stock, available_stock)
SELECT seed.name, seed.category, seed.icon, seed.total_stock, seed.available_stock
FROM seed_apparatus seed
WHERE NOT EXISTS (
  SELECT 1
  FROM apparatus existing
  WHERE existing.name = seed.name
);

INSERT INTO machines (name) VALUES
  ('Furnace'),
  ('Drying oven'),
  ('Lathe')
ON CONFLICT (name) DO NOTHING;

-- Two sample loans so the technician dashboard has something to show:
-- loan 1 is on time, loan 2 is already overdue.
-- Fixed timestamps provide stable keys for detecting these seed loans.
WITH sample_loans (student_id, borrowed_at, due_at) AS (
  VALUES
    ('2023-0001', '2026-11-16 08:00:00+08'::timestamptz, '2026-11-19 08:00:00+08'::timestamptz),
    ('2023-0002', '2026-11-12 08:00:00+08'::timestamptz, '2026-11-15 08:00:00+08'::timestamptz)
),
sample_loan_items (student_id, borrowed_at, apparatus_name, quantity) AS (
  VALUES
    ('2023-0001', '2026-11-16 08:00:00+08'::timestamptz, 'Beaker 250 mL', 2),
    ('2023-0001', '2026-11-16 08:00:00+08'::timestamptz, 'Safety goggles', 1),
    ('2023-0002', '2026-11-12 08:00:00+08'::timestamptz, 'Multimeter', 1),
    ('2023-0002', '2026-11-12 08:00:00+08'::timestamptz, 'Soldering iron', 1)
),
inserted_loans AS (
  INSERT INTO loans (student_id, borrowed_at, due_at)
  SELECT seed.student_id, seed.borrowed_at, seed.due_at
  FROM sample_loans seed
  WHERE NOT EXISTS (
    SELECT 1
    FROM loans existing
    WHERE existing.student_id = seed.student_id
      AND existing.borrowed_at = seed.borrowed_at
  )
    AND NOT EXISTS (
      SELECT 1
      FROM sample_loan_items item
      LEFT JOIN LATERAL (
        SELECT available_stock
        FROM apparatus
        WHERE name = item.apparatus_name
        ORDER BY id
        LIMIT 1
      ) stock ON TRUE
      WHERE item.student_id = seed.student_id
        AND item.borrowed_at = seed.borrowed_at
        AND COALESCE(stock.available_stock, 0) < item.quantity
    )
  RETURNING id, student_id, borrowed_at
),
existing_loans AS (
  SELECT DISTINCT ON (existing.student_id, existing.borrowed_at)
    existing.id,
    existing.student_id,
    existing.borrowed_at
  FROM loans existing
  JOIN sample_loans sample
    ON sample.student_id = existing.student_id
   AND sample.borrowed_at = existing.borrowed_at
  ORDER BY existing.student_id, existing.borrowed_at, existing.id
),
seed_loans AS (
  SELECT id, student_id, borrowed_at FROM inserted_loans
  UNION ALL
  SELECT id, student_id, borrowed_at FROM existing_loans
),
inserted_items AS (
  INSERT INTO loan_items (loan_id, apparatus_id, quantity)
  SELECT sample_loan.id, apparatus.id, item.quantity
  FROM seed_loans sample_loan
  JOIN sample_loan_items item
    ON item.student_id = sample_loan.student_id
   AND item.borrowed_at = sample_loan.borrowed_at
  JOIN LATERAL (
    SELECT id, available_stock
    FROM apparatus
    WHERE name = item.apparatus_name
    ORDER BY id
    LIMIT 1
  ) apparatus ON TRUE
  WHERE apparatus.available_stock >= item.quantity
    AND NOT EXISTS (
      SELECT 1
      FROM loan_items existing
      WHERE existing.loan_id = sample_loan.id
        AND existing.apparatus_id = apparatus.id
    )
  RETURNING apparatus_id, quantity
),
stock_changes AS (
  SELECT apparatus_id, SUM(quantity)::integer AS quantity
  FROM inserted_items
  GROUP BY apparatus_id
)
UPDATE apparatus
SET available_stock = apparatus.available_stock - stock_changes.quantity
FROM stock_changes
WHERE apparatus.id = stock_changes.apparatus_id;

-- Quick checks after running:
-- On an empty database:
--   SELECT COUNT(*) FROM apparatus;        -- expect 20
--   SELECT * FROM active_loans_view;       -- expect 2 rows, one Overdue

COMMIT;
