-- Run after database/migrations/005_add_machines.sql.
-- Re-running updates sample machine details without overwriting operational status.
INSERT INTO machines (name, model, specifications, notes, status) VALUES
  (
    'Furnace',
    'Thermo Scientific FB1410M',
    '1200 C maximum temperature; 14 L chamber.',
    'Use heat-resistant gloves when loading.',
    'available'
  ),
  (
    'Drying oven',
    'Memmert UN55',
    '53 L chamber; temperature range 20-300 C.',
    'Allow the chamber to cool before unloading.',
    'available'
  ),
  (
    'Lathe',
    'JET JWL-1221VS',
    'Variable speed wood lathe; 12 in. swing.',
    'Staff supervision required.',
    'available'
  ),
  (
    'Centrifuge',
    'Eppendorf 5810R',
    'Refrigerated bench-top centrifuge; 4,000 rpm maximum.',
    'Balance sample tubes before operation.',
    'available'
  ),
  (
    'Autoclave',
    'Tuttnauer 3870EA',
    'Horizontal steam sterilizer; 85 L chamber.',
    'Scheduled for routine maintenance.',
    'maintenance'
  ),
  (
    'Spectrophotometer',
    'Thermo Scientific GENESYS 150',
    'UV-visible wavelength range 190-1100 nm.',
    'Currently assigned to a laboratory session.',
    'in_use'
  )
ON CONFLICT (name) DO UPDATE
SET model = EXCLUDED.model,
    specifications = EXCLUDED.specifications,
    notes = EXCLUDED.notes,
    updated_at = NOW();
