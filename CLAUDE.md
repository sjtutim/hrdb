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
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run seed         # Seed database with admin user (xuhuayong@Inno.com / 123456A)
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create new migration
npx prisma studio    # Open Prisma database GUI
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
