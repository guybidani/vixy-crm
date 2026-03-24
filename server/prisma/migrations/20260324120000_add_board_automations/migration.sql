-- AlterTable: add automations JSON column to boards
ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "automations" JSONB;
