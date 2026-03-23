-- Add CallResult enum and snoozedUntil to tasks

DO $$ BEGIN
  CREATE TYPE "CallResult" AS ENUM ('ANSWERED','VOICEMAIL','NO_ANSWER','BUSY','RESCHEDULED','NOT_RELEVANT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "call_result" "CallResult",
  ADD COLUMN IF NOT EXISTS "snoozed_until" TIMESTAMP(3);
