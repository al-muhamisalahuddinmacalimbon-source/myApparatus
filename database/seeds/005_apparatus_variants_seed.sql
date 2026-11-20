BEGIN;

INSERT INTO apparatus (name, category, icon, total_stock, available_stock)
SELECT 'Beaker', 'Glassware', 'flask-conical', 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM apparatus WHERE name = 'Beaker' AND category = 'Glassware'
);

INSERT INTO apparatus (name, category, icon, total_stock, available_stock)
SELECT 'Wire Mesh', 'Tools', 'circle', 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM apparatus WHERE name = 'Wire Mesh' AND category = 'Tools'
);

INSERT INTO apparatus_variants
  (apparatus_id, name, total_stock, available_stock)
SELECT apparatus.id, seed.name, seed.total_stock, seed.available_stock
FROM (
  VALUES
    ('Beaker', 'Glassware', '50mL', 18, 18),
    ('Beaker', 'Glassware', '100mL', 16, 16),
    ('Beaker', 'Glassware', '250mL', 20, 20),
    ('Beaker', 'Glassware', '500mL', 15, 15),
    ('Wire Mesh', 'Tools', 'Ceramic Center', 8, 8),
    ('Wire Mesh', 'Tools', 'Plain Steel', 12, 12),
    ('Wire Mesh', 'Tools', 'Stainless Steel', 10, 10)
) AS seed(parent_name, parent_category, name, total_stock, available_stock)
JOIN LATERAL (
  SELECT id
  FROM apparatus
  WHERE apparatus.name = seed.parent_name
    AND apparatus.category = seed.parent_category
  ORDER BY id
  LIMIT 1
) apparatus ON TRUE
ON CONFLICT (apparatus_id, name) DO NOTHING;

COMMIT;
