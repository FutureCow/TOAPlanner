-- CreateTable
CREATE TABLE "SubjectConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL DEFAULT '#2563eb',
    "absenceDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubjectConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable: change subject from enum to text
-- First add a new text column
ALTER TABLE "Request" ADD COLUMN "subject_new" TEXT;

-- Copy enum values as text
UPDATE "Request" SET "subject_new" = "subject"::TEXT;

-- Drop the old enum column
ALTER TABLE "Request" DROP COLUMN "subject";

-- Rename the new column
ALTER TABLE "Request" RENAME COLUMN "subject_new" TO "subject";

-- Make it NOT NULL
ALTER TABLE "Request" ALTER COLUMN "subject" SET NOT NULL;

-- Drop the Subject enum (no longer needed)
DROP TYPE IF EXISTS "Subject";

-- Normalize legacy uppercase enum values to lowercase slugs
-- (matches new SubjectConfig ids: 'natuurkunde', 'scheikunde', 'biologie', 'project')
UPDATE "Request" SET "subject" = 'natuurkunde' WHERE "subject" = 'NATUURKUNDE';
UPDATE "Request" SET "subject" = 'scheikunde'  WHERE "subject" = 'SCHEIKUNDE';
UPDATE "Request" SET "subject" = 'biologie'    WHERE "subject" = 'BIOLOGIE';
UPDATE "Request" SET "subject" = 'project'     WHERE "subject" = 'PROJECT';
