-- CreateEnum
CREATE TYPE "FollowUpChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'CALL_TASK');

-- CreateEnum
CREATE TYPE "FollowUpExecutionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "follow_up_sequences" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_statuses" "ContactStatus"[],
    "end_action" TEXT NOT NULL DEFAULT 'MOVE_INACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_steps" (
    "id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "delay_days" INTEGER NOT NULL,
    "channel" "FollowUpChannel" NOT NULL,
    "message_template" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_executions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "status" "FollowUpExecutionStatus" NOT NULL DEFAULT 'ACTIVE',
    "next_run_at" TIMESTAMP(3),
    "last_step_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_executions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "follow_up_sequences" ADD CONSTRAINT "follow_up_sequences_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_steps" ADD CONSTRAINT "follow_up_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "follow_up_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_executions" ADD CONSTRAINT "follow_up_executions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_executions" ADD CONSTRAINT "follow_up_executions_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "follow_up_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_executions" ADD CONSTRAINT "follow_up_executions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
