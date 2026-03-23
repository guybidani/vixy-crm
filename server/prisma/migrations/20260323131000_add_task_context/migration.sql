-- CreateEnum
CREATE TYPE "TaskContext" AS ENUM ('SALES', 'SERVICE', 'GENERAL');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "task_context" "TaskContext" NOT NULL DEFAULT 'GENERAL';
