-- Adds columns required by the per-user prompt-settings feature that were
-- missing from the initial schema. Idempotent — safe to re-run.

ALTER TABLE "prompt_settings"
  ADD COLUMN IF NOT EXISTS "selected_model" text NOT NULL DEFAULT 'gpt-4o-mini',
  ADD COLUMN IF NOT EXISTS "dual_mode_selected_model" text NOT NULL DEFAULT 'MiniMax-Text-01',
  ADD COLUMN IF NOT EXISTS "coaching_resource" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "response_mode" text NOT NULL DEFAULT 'basic';