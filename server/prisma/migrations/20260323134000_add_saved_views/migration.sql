-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_by" TEXT,
    "sort_dir" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_views_workspace_id_member_id_entity_idx" ON "saved_views"("workspace_id", "member_id", "entity");

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
