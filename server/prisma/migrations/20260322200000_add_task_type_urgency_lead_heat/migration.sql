-- CreateEnum: TaskType
DO $$ BEGIN
  CREATE TYPE "TaskType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'WHATSAPP', 'FOLLOW_UP', 'TASK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: LeadHeat
DO $$ BEGIN
  CREATE TYPE "LeadHeat" AS ENUM ('HOT', 'WARM', 'LUKEWARM', 'COLD', 'FROZEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: UrgencyLevel
DO $$ BEGIN
  CREATE TYPE "UrgencyLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Add taskType to tasks
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "task_type" "TaskType" NOT NULL DEFAULT 'TASK',
  ADD COLUMN IF NOT EXISTS "outcome_note" TEXT;

-- AlterTable: Add leadHeat to contacts
ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "lead_heat" "LeadHeat";

-- AlterTable: Add urgencyLevel to tickets
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "urgency_level" "UrgencyLevel" NOT NULL DEFAULT 'MEDIUM';

-- Index for task_type queries
CREATE INDEX IF NOT EXISTS "tasks_workspace_id_task_type_idx" ON "tasks"("workspace_id", "task_type");
