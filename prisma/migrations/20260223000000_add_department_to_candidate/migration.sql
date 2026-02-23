-- CreateMigration
SELECT '20260223000000_add_department_to_candidate' AS migration_name;

-- AddField
ALTER TABLE "Candidate" ADD COLUMN "department" TEXT;
