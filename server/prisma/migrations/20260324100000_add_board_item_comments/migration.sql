-- CreateTable
CREATE TABLE "board_item_comments" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_item_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_item_comments_item_id_idx" ON "board_item_comments"("item_id");

-- AddForeignKey
ALTER TABLE "board_item_comments" ADD CONSTRAINT "board_item_comments_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_item_comments" ADD CONSTRAINT "board_item_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
