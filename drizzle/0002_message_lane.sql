-- Adds a `lane` column to `messages` so dual/compare conversations can persist
-- messages on both panes (primary/secondary for dual, basic/condensed for
-- compare). Normal conversations use the default `'single'`. Idempotent.
--
-- CREATE TYPE has no IF NOT EXISTS variant — scripts/migrate.ts already
-- swallows the `42710 duplicate_object` error for re-runs, so this is safe.

CREATE TYPE "public"."message_lane" AS ENUM('single', 'primary', 'secondary', 'basic', 'condensed');--> statement-breakpoint

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "lane" "public"."message_lane" NOT NULL DEFAULT 'single';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "messages_conv_lane_created_idx"
  ON "messages" USING btree ("conversation_id","lane","created_at");