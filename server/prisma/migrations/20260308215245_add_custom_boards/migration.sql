-- CreateEnum
CREATE TYPE "BoardColumnType" AS ENUM ('TEXT', 'NUMBER', 'STATUS', 'DATE', 'PERSON', 'EMAIL', 'PHONE', 'LINK', 'PRIORITY', 'CHECKBOX');

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT 'LayoutGrid',
    "color" TEXT DEFAULT '#579BFC',
    "template_key" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_columns" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "BoardColumnType" NOT NULL DEFAULT 'TEXT',
    "width" TEXT DEFAULT '150px',
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,

    CONSTRAINT "board_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_groups" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#579BFC',
    "order" INTEGER NOT NULL DEFAULT 0,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "board_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_items" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_item_values" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "column_id" TEXT NOT NULL,
    "text_value" TEXT,
    "number_value" DOUBLE PRECISION,
    "date_value" TIMESTAMP(3),
    "json_value" JSONB,

    CONSTRAINT "board_item_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "boards_workspace_id_idx" ON "boards"("workspace_id");

-- CreateIndex
CREATE INDEX "board_columns_board_id_order_idx" ON "board_columns"("board_id", "order");

-- CreateIndex
CREATE INDEX "board_groups_board_id_order_idx" ON "board_groups"("board_id", "order");

-- CreateIndex
CREATE INDEX "board_items_group_id_order_idx" ON "board_items"("group_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "board_item_values_item_id_column_id_key" ON "board_item_values"("item_id", "column_id");

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_groups" ADD CONSTRAINT "board_groups_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_items" ADD CONSTRAINT "board_items_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_items" ADD CONSTRAINT "board_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "board_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_item_values" ADD CONSTRAINT "board_item_values_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_item_values" ADD CONSTRAINT "board_item_values_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "board_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
