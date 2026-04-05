-- AlterTable: add periodEnd and recurringGroupId to Request
ALTER TABLE "Request" ADD COLUMN "periodEnd" INTEGER;
ALTER TABLE "Request" ADD COLUMN "recurringGroupId" TEXT;
