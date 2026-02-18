-- Fix schema drift: add columns/tables created via prisma db push without migrations.
-- All operations use IF NOT EXISTS for idempotency (safe on both fresh and existing DBs).

-- 1. Add resumeFileName to Candidate
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "resumeFileName" TEXT;

-- 2. Add createdById to Interview
ALTER TABLE "Interview" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Add FK: Interview.createdById -> User
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Interview_createdById_fkey'
  ) THEN
    ALTER TABLE "Interview" ADD CONSTRAINT "Interview_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Create PerformanceReview table
CREATE TABLE IF NOT EXISTS "PerformanceReview" (
    "id"             TEXT NOT NULL,
    "employeeId"     TEXT NOT NULL,
    "date"           TIMESTAMP(3) NOT NULL,
    "type"           TEXT NOT NULL,
    "score"          DOUBLE PRECISION NOT NULL,
    "level"          TEXT,
    "summary"        TEXT NOT NULL,
    "strengths"      TEXT,
    "improvements"   TEXT,
    "reviewer"       TEXT NOT NULL,
    "attachmentUrl"  TEXT,
    "attachmentName" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- Add FK: PerformanceReview.employeeId -> Employee
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PerformanceReview_employeeId_fkey'
  ) THEN
    ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
