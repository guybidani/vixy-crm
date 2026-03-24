-- AlterTable: Add done and parentItemId to board_items
ALTER TABLE "board_items" ADD COLUMN "done" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "board_items" ADD COLUMN "parent_item_id" TEXT;

-- CreateIndex for parentItemId
CREATE INDEX "board_items_parent_item_id_idx" ON "board_items"("parent_item_id");

-- AddForeignKey for self-relation
ALTER TABLE "board_items" ADD CONSTRAINT "board_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: board_item_files
CREATE TABLE "board_item_files" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_item_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for board_item_files
CREATE INDEX "board_item_files_item_id_idx" ON "board_item_files"("item_id");

-- AddForeignKey for board_item_files
ALTER TABLE "board_item_files" ADD CONSTRAINT "board_item_files_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
