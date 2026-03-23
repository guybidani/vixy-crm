-- AlterTable: Change String columns to TEXT
ALTER TABLE "deals" ALTER COLUMN "notes" SET DATA TYPE TEXT;
ALTER TABLE "tasks" ALTER COLUMN "description" SET DATA TYPE TEXT;
ALTER TABLE "tickets" ALTER COLUMN "description" SET DATA TYPE TEXT;
ALTER TABLE "ticket_messages" ALTER COLUMN "body" SET DATA TYPE TEXT;
ALTER TABLE "activities" ALTER COLUMN "body" SET DATA TYPE TEXT;
ALTER TABLE "kb_articles" ALTER COLUMN "body" SET DATA TYPE TEXT;

-- AlterTable: Add soft delete to contacts
ALTER TABLE "contacts" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex: Deal
CREATE INDEX "deals_workspace_id_assignee_id_idx" ON "deals"("workspace_id", "assignee_id");
CREATE INDEX "deals_workspace_id_updated_at_idx" ON "deals"("workspace_id", "updated_at");

-- CreateIndex: Task
CREATE INDEX "tasks_workspace_id_due_date_idx" ON "tasks"("workspace_id", "due_date");
CREATE INDEX "tasks_workspace_id_completed_at_idx" ON "tasks"("workspace_id", "completed_at");

-- CreateIndex: Activity
CREATE INDEX "activities_workspace_id_member_id_idx" ON "activities"("workspace_id", "member_id");
CREATE INDEX "activities_workspace_id_deal_id_idx" ON "activities"("workspace_id", "deal_id");
CREATE INDEX "activities_workspace_id_ticket_id_idx" ON "activities"("workspace_id", "ticket_id");

-- CreateIndex: Ticket
CREATE INDEX "tickets_workspace_id_assignee_id_idx" ON "tickets"("workspace_id", "assignee_id");

-- CreateIndex: Contact
CREATE INDEX "contacts_workspace_id_company_id_idx" ON "contacts"("workspace_id", "company_id");
CREATE INDEX "contacts_workspace_id_next_follow_up_date_idx" ON "contacts"("workspace_id", "next_follow_up_date");
CREATE INDEX "contacts_workspace_id_deleted_at_idx" ON "contacts"("workspace_id", "deleted_at");

-- CreateIndex: TicketMessage
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");
