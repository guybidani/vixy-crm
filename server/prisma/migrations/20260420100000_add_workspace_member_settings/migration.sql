-- Per-member preferences (dashboard layout, etc.).
-- Scoped to the workspace_member row so the same user can have different
-- preferences per workspace.
ALTER TABLE "workspace_members"
  ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
