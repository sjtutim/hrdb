# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

公司人才库 (Inno HeroBase) - An AI-powered HR talent management system for resume parsing, candidate tracking, job matching, and interview scheduling.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js with credentials provider (JWT sessions)
- **UI**: Tailwind CSS, Radix UI, shadcn/ui components
- **AI Integration**: DeepSeek/Kimi APIs for resume parsing (to be fully implemented)

## Commands

```bash
pnpm dev             # Start development server
pnpm build           # Build for production
pnpm lint            # Run ESLint
pnpm seed            # Seed database with admin user (xuhuayong@Inno.com / 123456A)
pnpm prisma generate  # Regenerate Prisma client after schema changes
pnpm prisma migrate dev --name <name>  # Create new migration
pnpm prisma studio    # Open Prisma database GUI
```

## Architecture

### Directory Structure

- `src/app/` - Next.js App Router pages and API routes
  - `api/` - API route handlers (candidates, interviews, job-postings, matches, resume, tags, users)
  - `components/` - Shared React components (auth, layout, ui)
  - `lib/` - Utilities (`cn()` helper, hooks)
- `prisma/` - Database schema and migrations

### Key Data Models (prisma/schema.prisma)

- **User** - System users with roles (ADMIN, HR, RECRUITER, MANAGER)
- **Candidate** - Job seekers with resume data, scores, and status tracking
- **JobPosting** - Job listings with tags and requirements
- **JobMatch** - AI-scored candidate-to-job matching records
- **Interview** - Interview scheduling with types (PHONE, TECHNICAL, HR, MANAGER, PERSONALITY)
- **Employee** - Post-hire employee records with rewards/penalties tracking

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Application URL

## Notes

- The project uses Chinese (zh-CN) as the primary language for UI
- Resume files are uploaded to `uploads/` directory
- AI resume parsing currently uses mock implementations - actual API integration pending

## Database Schema Change Rules

当需要新增数据表列或修改表结构时，必须遵循以下流程，**严禁跳步**：

### 开发阶段（本地）

1. 修改 `prisma/schema.prisma`
2. 生成迁移文件：
   ```bash
   npx prisma migrate dev --name <描述性名称>
   ```
3. 将迁移文件与代码**一起提交**：
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git add src/
   git commit -m "feat: ..."
   git push origin main
   ```

> 迁移文件（`prisma/migrations/`）必须随代码一起入库，服务器部署依赖它执行增量升级。

### 服务器部署阶段

```bash
git pull origin main          # 1. 拉取代码（含迁移文件）
./docker/deploy.sh build      # 2. 构建新镜像
./docker/deploy.sh migrate    # 3. 增量执行迁移（保留所有数据）
./docker/deploy.sh restart    # 4. 重启应用
```

### 禁止事项

- **禁止**直接在服务器上修改 `schema.prisma`
- **禁止**用 `down-v` 来"应用新结构"（会删除所有数据）
- **禁止**只推前端代码而不推迁移文件
- **禁止**跳过 `build` 直接 `restart`

### 升级前必须备份

```bash
docker exec hrdb-postgres pg_dump -U hrdb hrdb > backup_$(date +%Y%m%d).sql
```

详细说明参见 `docker/README.md` — 「含数据库变更的代码升级指南」章节。
