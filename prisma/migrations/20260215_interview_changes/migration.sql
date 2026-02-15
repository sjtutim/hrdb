-- Add location field to Interview
ALTER TABLE "Interview" ADD COLUMN "location" TEXT;

-- Create many-to-many relation table for Interview and User (interviewers)
CREATE TABLE "_InterviewToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_InterviewToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_InterviewToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index for the relation
CREATE UNIQUE INDEX "_InterviewToUser_AB_unique" ON "_InterviewToUser"("A", "B");

-- Create index for faster lookups
CREATE INDEX "_InterviewToUser_B_index" ON "_InterviewToUser"("B");

-- Migrate existing interviewerId to the new many-to-many relation
INSERT INTO "_InterviewToUser" ("A", "B")
SELECT "id", "interviewerId" FROM "Interview" WHERE "interviewerId" IS NOT NULL;

-- Drop the old interviewerId column
ALTER TABLE "Interview" DROP COLUMN "interviewerId";
