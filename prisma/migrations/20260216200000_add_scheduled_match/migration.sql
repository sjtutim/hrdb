-- CreateEnum
CREATE TYPE "ScheduledMatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ScheduledMatch" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "candidateIds" TEXT[],
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledMatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalCandidates" INTEGER NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledMatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScheduledMatch" ADD CONSTRAINT "ScheduledMatch_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
