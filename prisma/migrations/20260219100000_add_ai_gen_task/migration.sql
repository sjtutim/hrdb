-- CreateEnum
CREATE TYPE "AiGenStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AiGenTask" (
    "id"           TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "department"   TEXT NOT NULL,
    "tags"         TEXT[],
    "status"       "AiGenStatus" NOT NULL DEFAULT 'PENDING',
    "description"  TEXT,
    "requirements" TEXT,
    "error"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGenTask_pkey" PRIMARY KEY ("id")
);
