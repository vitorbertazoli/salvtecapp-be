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
- You can access the VPS via ssh root@76.13.164.63
- The VPS is an alpine linux
- before running any command via SSH, check if you are running the command on powershell or bash, because it will affect how commands are wrapped, ideally you want to create a bash script, scp it to the server and execute it on the server to avoid any issues.

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
