-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'APPROVED_WITH_TOA', 'APPROVED_WITHOUT_TOA', 'REJECTED');

-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('NATUURKUNDE', 'SCHEIKUNDE', 'BIOLOGIE', 'PROJECT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "abbreviation" TEXT NOT NULL,
    "isTeacher" BOOLEAN NOT NULL DEFAULT true,
    "isTOA" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "classroom" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" INTEGER NOT NULL,
    "subject" "Subject" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
