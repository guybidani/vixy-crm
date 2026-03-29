-- Add last_activity_at column to board_items (was missing due to migration edit after apply)
ALTER TABLE "board_items" ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP(3);
