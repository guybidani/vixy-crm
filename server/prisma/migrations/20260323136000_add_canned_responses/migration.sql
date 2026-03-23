-- Upgrade canned_responses table: rename title->name, add channel/subject/variables/isActive/usageCount/createdById

-- Add new columns
ALTER TABLE "canned_responses" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "canned_responses" ADD COLUMN "subject" TEXT;
ALTER TABLE "canned_responses" ADD COLUMN "variables" JSONB;
ALTER TABLE "canned_responses" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "canned_responses" ADD COLUMN "usage_count" INTEGER NOT NULL DEFAULT 0;

-- Rename title -> name
ALTER TABLE "canned_responses" RENAME COLUMN "title" TO "name";

-- Set category default for existing rows
UPDATE "canned_responses" SET "category" = 'GENERAL' WHERE "category" IS NULL;
ALTER TABLE "canned_responses" ALTER COLUMN "category" SET NOT NULL;
ALTER TABLE "canned_responses" ALTER COLUMN "category" SET DEFAULT 'GENERAL';

-- Change body to TEXT type (already text in postgres, but ensure)
ALTER TABLE "canned_responses" ALTER COLUMN "body" TYPE TEXT;

-- Add created_by_id (nullable first, then backfill, then make required)
ALTER TABLE "canned_responses" ADD COLUMN "created_by_id" TEXT;

-- Backfill created_by_id from member_id where possible
UPDATE "canned_responses" SET "created_by_id" = "member_id" WHERE "member_id" IS NOT NULL;

-- For rows without member_id, assign the first workspace member (owner)
UPDATE "canned_responses" cr
SET "created_by_id" = (
  SELECT wm.id FROM "workspace_members" wm
  WHERE wm."workspace_id" = cr."workspace_id"
  ORDER BY wm."invited_at" ASC
  LIMIT 1
)
WHERE cr."created_by_id" IS NULL;

-- Delete orphan rows that still have no created_by_id
DELETE FROM "canned_responses" WHERE "created_by_id" IS NULL;

-- Now make it required
ALTER TABLE "canned_responses" ALTER COLUMN "created_by_id" SET NOT NULL;

-- Add foreign key
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old member_id column
ALTER TABLE "canned_responses" DROP COLUMN "member_id";

-- Add index
CREATE INDEX "canned_responses_workspace_id_category_idx" ON "canned_responses"("workspace_id", "category");
