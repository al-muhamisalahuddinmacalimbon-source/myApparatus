CREATE OR REPLACE FUNCTION sync_apparatus_stock_from_variants(p_apparatus_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM apparatus_variants
    WHERE apparatus_id = p_apparatus_id
  ) THEN
    UPDATE apparatus AS a
    SET
      total_stock = variant_totals.total_stock,
      available_stock = variant_totals.available_stock
    FROM (
      SELECT
        apparatus_id,
        SUM(total_stock)::INTEGER AS total_stock,
        SUM(available_stock)::INTEGER AS available_stock
      FROM apparatus_variants
      WHERE apparatus_id = p_apparatus_id
      GROUP BY apparatus_id
    ) AS variant_totals
    WHERE a.id = variant_totals.apparatus_id;
  ELSE
    UPDATE apparatus
    SET total_stock = 0, available_stock = 0
    WHERE id = p_apparatus_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sync_apparatus_stock_after_variant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_apparatus_stock_from_variants(OLD.apparatus_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.apparatus_id IS DISTINCT FROM NEW.apparatus_id THEN
    PERFORM sync_apparatus_stock_from_variants(OLD.apparatus_id);
  END IF;

  PERFORM sync_apparatus_stock_from_variants(NEW.apparatus_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_apparatus_stock_after_variant_change
  ON apparatus_variants;

CREATE TRIGGER trg_sync_apparatus_stock_after_variant_change
AFTER INSERT OR UPDATE OR DELETE ON apparatus_variants
FOR EACH ROW
EXECUTE FUNCTION sync_apparatus_stock_after_variant_change();

-- Reconcile existing variant parents, including Beaker and Wire Mesh seeds.
SELECT sync_apparatus_stock_from_variants(apparatus_id)
FROM (
  SELECT DISTINCT apparatus_id
  FROM apparatus_variants
) AS variant_parents;

ALTER TABLE loan_items
  ADD COLUMN IF NOT EXISTS return_condition TEXT DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS damaged_qty INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lost_qty INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS damage_notes TEXT;

ALTER TABLE loan_items
  ALTER COLUMN return_condition SET DEFAULT 'good',
  ALTER COLUMN damaged_qty SET DEFAULT 0,
  ALTER COLUMN lost_qty SET DEFAULT 0;

UPDATE loan_items
SET
  return_condition = COALESCE(return_condition, 'good'),
  damaged_qty = COALESCE(damaged_qty, 0),
  lost_qty = COALESCE(lost_qty, 0);

ALTER TABLE loan_items
  ALTER COLUMN return_condition SET NOT NULL,
  ALTER COLUMN damaged_qty SET NOT NULL,
  ALTER COLUMN lost_qty SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loan_items_return_condition_check'
      AND conrelid = 'loan_items'::regclass
  ) THEN
    ALTER TABLE loan_items
      ADD CONSTRAINT loan_items_return_condition_check
      CHECK (return_condition IN ('good', 'damaged', 'lost'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loan_items_damaged_qty_check'
      AND conrelid = 'loan_items'::regclass
  ) THEN
    ALTER TABLE loan_items
      ADD CONSTRAINT loan_items_damaged_qty_check
      CHECK (damaged_qty >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loan_items_lost_qty_check'
      AND conrelid = 'loan_items'::regclass
  ) THEN
    ALTER TABLE loan_items
      ADD CONSTRAINT loan_items_lost_qty_check
      CHECK (lost_qty >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loan_items_damaged_lost_qty_check'
      AND conrelid = 'loan_items'::regclass
  ) THEN
    ALTER TABLE loan_items
      ADD CONSTRAINT loan_items_damaged_lost_qty_check
      CHECK (
        damaged_qty + lost_qty <= returned_quantity
        AND damaged_qty + lost_qty <= quantity
      );
  END IF;
END;
$$;
