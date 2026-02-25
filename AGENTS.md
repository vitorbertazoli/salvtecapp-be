# AGENTS.md — salvtec-app-be

## Purpose
Guidance for humans/AI agents working in the backend project.

## Stack
- NestJS + TypeScript
- MongoDB + Mongoose
- JWT auth

## Run & Validate
- Install: `npm ci`
- Dev: `npm run start:dev`
- Build: `npm run build`
- Tests: `npm run test`
- E2E: `npm run test:e2e`

## Common Scripts
- Init DB: `npm run initDB`
- Seed data: `npm run seed -- "<account-name>"`
- Add master admin: `npm run addMasterAdmin`

## Coding Rules
- Keep changes small and scoped to the request.
- Follow existing module structure (`src/<domain>`).
- Reuse existing DTO/Schema/Service patterns.
- Do not change API contracts unless explicitly requested.
- Prefer fixing root cause over patching symptoms.

## Database & Safety
- Never run destructive operations on production.
- Seed/reset scripts are for development/staging only.
- Preserve account isolation (`account` field filtering) in queries.

## PR/Change Checklist
- Build passes (`npm run build`).
- Relevant tests pass.
- No unrelated refactors.
- Update docs when behavior/API changes.
