-- 修复 schema drift：移除初始迁移中创建的旧唯一约束
-- 开发环境通过 prisma db push 自动同步，但生产环境依赖迁移文件

-- 1. 移除 Candidate.email 唯一约束（schema 已改为 email String? 非唯一）
DROP INDEX IF EXISTS "Candidate_email_key";

-- 2. 移除 Tag.name 单列唯一约束（schema 已改为 @@unique([name, category]) 组合唯一）
DROP INDEX IF EXISTS "Tag_name_key";

-- 3. 确保 Tag(name, category) 组合唯一索引存在
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_category_key" ON "Tag"("name", "category");
