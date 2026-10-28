

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

INSERT INTO apparatus (name, category, icon, total_stock, available_stock) VALUES
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
  ('Lab gloves (box)',     'Safety',      'hand',          10, 10);

INSERT INTO machines (name) VALUES
  ('Furnace'),
  ('Drying oven'),
  ('Lathe');

-- Two sample loans so the technician dashboard has something to show:
-- loan 1 is on time, loan 2 is already overdue.
INSERT INTO loans (student_id, borrowed_at, due_at) VALUES
  ('2023-0001', NOW() - INTERVAL '1 day',  NOW() + INTERVAL '2 days'),
  ('2023-0002', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days');

INSERT INTO loan_items (loan_id, apparatus_id, quantity) VALUES
  (1, 1,  2),   -- Beaker 250 mL x2
  (1, 19, 1),   -- Safety goggles x1
  (2, 7,  1),   -- Multimeter x1
  (2, 10, 1);   -- Soldering iron x1

-- Reduce available stock for the items on the sample loans
UPDATE apparatus a
SET available_stock = a.available_stock - li.qty
FROM (
  SELECT apparatus_id, SUM(quantity) AS qty
  FROM loan_items
  GROUP BY apparatus_id
) li
WHERE a.id = li.apparatus_id;

-- Quick checks after running:
--   SELECT COUNT(*) FROM apparatus;        -- expect 20
--   SELECT * FROM active_loans_view;       -- expect 2 rows, one Overdue
