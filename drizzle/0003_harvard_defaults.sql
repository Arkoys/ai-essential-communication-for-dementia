-- Post-MiniMax removal: flip column defaults to Harvard + gpt-5.5, and
-- migrate any existing rows that still store the legacy 'minimax' /
-- 'MiniMax-Text-01' values. Idempotent — safe to re-run.
--
-- 1. Loosen defaults so we can update existing rows in-place.
ALTER TABLE "prompt_settings"
  ALTER COLUMN "dual_mode_provider"     DROP DEFAULT,
  ALTER COLUMN "dual_mode_selected_model" DROP DEFAULT,
  ALTER COLUMN "selected_model"         DROP DEFAULT;

-- 2. Backfill any rows still pointing at the removed provider.
UPDATE "prompt_settings"
   SET "provider"                  = 'harvard',
       "dual_mode_provider"        = 'harvard',
       "selected_model"            = 'gpt-5.5',
       "dual_mode_selected_model"  = 'gpt-5.5'
 WHERE "provider"                = 'minimax'
    OR "dual_mode_provider"      = 'minimax'
    OR "dual_mode_selected_model" = 'MiniMax-Text-01'
    OR "selected_model"          IN ('MiniMax-Text-01', 'MiniMax-M2.7');

-- 3. Re-seat defaults for future rows.
ALTER TABLE "prompt_settings"
  ALTER COLUMN "provider"                 SET DEFAULT 'harvard',
  ALTER COLUMN "dual_mode_provider"       SET DEFAULT 'harvard',
  ALTER COLUMN "selected_model"           SET DEFAULT 'gpt-5.5',
  ALTER COLUMN "dual_mode_selected_model" SET DEFAULT 'gpt-5.5';