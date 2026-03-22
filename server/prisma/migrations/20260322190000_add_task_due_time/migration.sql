-- AddColumn: due_time and reminder_minutes to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "due_time" VARCHAR;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reminder_minutes" INTEGER DEFAULT 15;
