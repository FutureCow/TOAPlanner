-- AlterTable: add klas to Request
ALTER TABLE "Request" ADD COLUMN "klas" TEXT NOT NULL DEFAULT '';

-- AlterTable: add defaultPage to User
ALTER TABLE "User" ADD COLUMN "defaultPage" TEXT;
