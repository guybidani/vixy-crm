-- CreateIndex
CREATE INDEX "activities_workspace_id_created_at_idx" ON "activities"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_workspace_id_contact_id_idx" ON "activities"("workspace_id", "contact_id");

-- CreateIndex
CREATE INDEX "companies_workspace_id_idx" ON "companies"("workspace_id");

-- CreateIndex
CREATE INDEX "contacts_workspace_id_status_idx" ON "contacts"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "contacts_workspace_id_created_at_idx" ON "contacts"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "deals_workspace_id_stage_idx" ON "deals"("workspace_id", "stage");

-- CreateIndex
CREATE INDEX "deals_workspace_id_created_at_idx" ON "deals"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "follow_up_executions_workspace_id_status_idx" ON "follow_up_executions"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "follow_up_executions_next_run_at_idx" ON "follow_up_executions"("next_run_at");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_status_idx" ON "tasks"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_assignee_id_idx" ON "tasks"("workspace_id", "assignee_id");

-- CreateIndex
CREATE INDEX "tickets_workspace_id_status_idx" ON "tickets"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "tickets_workspace_id_created_at_idx" ON "tickets"("workspace_id", "created_at");
