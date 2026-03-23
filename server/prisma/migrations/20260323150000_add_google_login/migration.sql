-- AlterTable: make password_hash optional (for Google-only users)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: add google_id column
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;

-- CreateIndex: unique constraint on google_id
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
