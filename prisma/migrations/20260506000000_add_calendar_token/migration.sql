ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_calendarToken_key" ON "User"("calendarToken");
