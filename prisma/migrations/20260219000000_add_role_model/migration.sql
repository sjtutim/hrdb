-- CreateTable: Role model for dynamic role management
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_value_key" ON "Role"("value");

-- Seed default roles (only ADMIN is a system role that cannot be deleted)
INSERT INTO "Role" ("id", "value", "label", "isSystem", "createdAt") VALUES
    (gen_random_uuid(), 'ADMIN', '管理员', true, NOW()),
    (gen_random_uuid(), 'HR', '人力资源', false, NOW()),
    (gen_random_uuid(), 'RECRUITER', '招聘人员', false, NOW()),
    (gen_random_uuid(), 'MANAGER', '部门主管', false, NOW());

-- AlterTable User: change role from enum to String
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'RECRUITER';

-- AlterTable RolePermission: change role from enum to String
ALTER TABLE "RolePermission" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;

-- DropEnum
DROP TYPE IF EXISTS "UserRole";
