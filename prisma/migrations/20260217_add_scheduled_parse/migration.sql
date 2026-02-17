-- CreateEnum
CREATE TYPE "ScheduledParseStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ScheduledParse" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledParseStatus" NOT NULL DEFAULT 'PENDING',
    "candidateId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledParse_pkey" PRIMARY KEY ("id")
);
