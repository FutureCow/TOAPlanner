CREATE TABLE "ExceptionSchedule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "periodStartTime" TEXT NOT NULL DEFAULT '08:30',
  "periodDuration" INTEGER NOT NULL DEFAULT 50,
  "breaks" JSONB,
  "weeks" TEXT[] NOT NULL DEFAULT '{}',
  CONSTRAINT "ExceptionSchedule_pkey" PRIMARY KEY ("id")
);
