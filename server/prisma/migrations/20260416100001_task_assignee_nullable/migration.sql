-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assignee_id_fkey";

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "assignee_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
