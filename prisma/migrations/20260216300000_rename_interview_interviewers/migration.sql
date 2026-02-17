-- RenameTable: _InterviewToUser -> _InterviewInterviewers
-- This preserves existing data by renaming instead of drop+create

-- Drop existing foreign keys
ALTER TABLE "_InterviewToUser" DROP CONSTRAINT "_InterviewToUser_A_fkey";
ALTER TABLE "_InterviewToUser" DROP CONSTRAINT "_InterviewToUser_B_fkey";

-- Rename the table
ALTER TABLE "_InterviewToUser" RENAME TO "_InterviewInterviewers";

-- Rename indexes
ALTER INDEX "_InterviewToUser_AB_unique" RENAME TO "_InterviewInterviewers_AB_unique";
ALTER INDEX "_InterviewToUser_B_index" RENAME TO "_InterviewInterviewers_B_index";

-- Re-add foreign keys with new names
ALTER TABLE "_InterviewInterviewers" ADD CONSTRAINT "_InterviewInterviewers_A_fkey" FOREIGN KEY ("A") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InterviewInterviewers" ADD CONSTRAINT "_InterviewInterviewers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
