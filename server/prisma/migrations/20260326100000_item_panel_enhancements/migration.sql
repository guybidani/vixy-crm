-- AlterTable: add description to board_items
ALTER TABLE "board_items" ADD COLUMN "description" TEXT;

-- AlterTable: add reactions and edited_at to board_item_comments
ALTER TABLE "board_item_comments" ADD COLUMN "reactions" JSONB DEFAULT '{}';
ALTER TABLE "board_item_comments" ADD COLUMN "edited_at" TIMESTAMP(3);

-- CreateTable: board_item_activities
CREATE TABLE "board_item_activities" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "type" TEXT NOT NULL,
    "column_key" TEXT,
    "column_label" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_item_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_item_activities_item_id_created_at_idx" ON "board_item_activities"("item_id", "created_at");

-- AddForeignKey
ALTER TABLE "board_item_activities" ADD CONSTRAINT "board_item_activities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
