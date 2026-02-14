-- Convert workExperience from Int to Text, preserving existing values as "X年工作经验"
-- First convert to text
ALTER TABLE "Candidate" ALTER COLUMN "workExperience" SET DATA TYPE TEXT;
-- Then update existing numeric values to descriptive text
UPDATE "Candidate" SET "workExperience" = "workExperience" || '年工作经验' WHERE "workExperience" IS NOT NULL AND "workExperience" ~ '^\d+$';

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
