-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN "recurrence_type" TEXT;
ALTER TABLE "tasks" ADD COLUMN "recurrence_day" INTEGER;
ALTER TABLE "tasks" ADD COLUMN "recurrence_end_date" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" TEXT;

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
