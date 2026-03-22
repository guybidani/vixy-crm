-- CreateEnum
CREATE TYPE "BoardPermission" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- AlterTable
ALTER TABLE "boards" ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "board_access" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "permission" "BoardPermission" NOT NULL DEFAULT 'VIEWER',
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_access_board_id_idx" ON "board_access"("board_id");

-- CreateIndex
CREATE INDEX "board_access_member_id_idx" ON "board_access"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_access_board_id_member_id_key" ON "board_access"("board_id", "member_id");

-- AddForeignKey
ALTER TABLE "board_access" ADD CONSTRAINT "board_access_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_access" ADD CONSTRAINT "board_access_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
