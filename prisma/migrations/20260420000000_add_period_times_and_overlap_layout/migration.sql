-- Add overlapLayout to SubjectConfig
ALTER TABLE "SubjectConfig" ADD COLUMN "overlapLayout" TEXT NOT NULL DEFAULT 'stacked';

-- Add periodStartTime, periodDuration, and breaks to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "periodStartTime" TEXT NOT NULL DEFAULT '08:30';
ALTER TABLE "AppSettings" ADD COLUMN "periodDuration" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "AppSettings" ADD COLUMN "breaks" JSONB;
