-- AlterTable: 添加 probationAt 字段，记录候选人进入试用期的时间，用于招聘周期统计
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "probationAt" TIMESTAMP(3);
