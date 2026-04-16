-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_workspace_id_entity_type_entity_id_idx" ON "notes"("workspace_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
