/*
  Warnings:

  - You are about to drop the column `score` on the `Interview` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "score",
ADD COLUMN     "decision" TEXT,
ADD COLUMN     "feedback" TEXT;

-- CreateTable
CREATE TABLE "InterviewScore" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InterviewScore" ADD CONSTRAINT "InterviewScore_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
