-- Add soft-delete columns to deals, companies, and tasks
-- Revenue data (deals) shouldn't be hard-deleted; company/task parity follows.

-- AlterTable: Deal
ALTER TABLE "deals" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: Company
ALTER TABLE "companies" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: Task
ALTER TABLE "tasks" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "deals_workspace_id_deleted_at_idx" ON "deals"("workspace_id", "deleted_at");
CREATE INDEX "companies_workspace_id_deleted_at_idx" ON "companies"("workspace_id", "deleted_at");
CREATE INDEX "tasks_workspace_id_deleted_at_idx" ON "tasks"("workspace_id", "deleted_at");
