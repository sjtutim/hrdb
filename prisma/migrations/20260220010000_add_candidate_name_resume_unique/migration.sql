-- Ensure Candidate upsert target (name, resumeFileName) has a backing unique index.
-- This fixes runtime SQL: ON CONFLICT ("name","resumeFileName") ...

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Candidate"
    WHERE "resumeFileName" IS NOT NULL
    GROUP BY "name", "resumeFileName"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create unique index on Candidate(name, resumeFileName): duplicate non-null pairs exist. Please deduplicate Candidate rows first.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'Candidate'
      AND indexname = 'Candidate_name_resumeFileName_key'
  ) THEN
    CREATE UNIQUE INDEX "Candidate_name_resumeFileName_key"
      ON "Candidate"("name", "resumeFileName");
  END IF;
END $$;
