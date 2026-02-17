-- Add interviewerId to InterviewScore
ALTER TABLE "InterviewScore" ADD COLUMN "interviewerId" TEXT NOT NULL;

ALTER TABLE "InterviewScore" ADD CONSTRAINT "InterviewScore_interviewerId_fkey"
    FOREIGN KEY ("interviewerId") REFERENCES "User" (id) ON DELETE CASCADE ON UPDATE CASCADE;
