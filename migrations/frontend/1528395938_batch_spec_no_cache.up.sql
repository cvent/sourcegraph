BEGIN;

ALTER TABLE batch_specs ADD COLUMN IF NOT EXISTS no_cache BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;