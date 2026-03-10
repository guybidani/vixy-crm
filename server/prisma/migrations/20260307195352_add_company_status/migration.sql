-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'PROSPECT';
