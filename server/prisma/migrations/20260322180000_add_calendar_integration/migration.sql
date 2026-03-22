-- Drop old google_calendar_connections table if it exists (replaced by calendar_integrations)
DROP TABLE IF EXISTS "google_calendar_connections";

-- Create calendar_integrations table (uses TEXT ids to match existing schema)
CREATE TABLE IF NOT EXISTS "calendar_integrations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "workspace_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "google_email" VARCHAR NOT NULL,
  "google_calendar_id" VARCHAR NOT NULL DEFAULT 'primary',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "connected_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_integrations_member_id_key" UNIQUE ("member_id"),
  CONSTRAINT "calendar_integrations_workspace_id_member_id_key" UNIQUE ("workspace_id", "member_id")
);

-- Add google_calendar_event_id to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "google_calendar_event_id" VARCHAR;

-- Foreign keys (only add if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_integrations_workspace_id_fkey'
  ) THEN
    ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_integrations_member_id_fkey'
  ) THEN
    ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_member_id_fkey"
      FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "calendar_integrations_workspace_id_idx" ON "calendar_integrations"("workspace_id");
CREATE INDEX IF NOT EXISTS "calendar_integrations_member_id_idx" ON "calendar_integrations"("member_id");
