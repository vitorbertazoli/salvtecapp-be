# Backend Skills Catalog

This file indexes high-value Copilot skills for recurring backend workflows in this repository.

Keep policy and guardrails in [AGENTS.md](../../AGENTS.md). Use this file for on-demand workflows that benefit from structured, repeatable execution.

## How to Use

1. Find a workflow below that matches your task.
2. Use the listed trigger phrases in your prompt.
3. Ask for concrete deliverables (checks run, files touched, tests added, risks found).

## Priority Skills

### 1) Account Isolation Verifier

- Use when: adding/changing controllers, services, or MongoDB queries.
- Trigger phrases: `add endpoint`, `account isolation`, `tenant leak`, `missing account filter`.
- Skill file: [account-isolation-verifier/SKILL.md](./account-isolation-verifier/SKILL.md)
- Scope:
	- Validate `@GetAccountId()` usage in controller methods.
	- Validate query filters always include account scoping where required.
	- Flag potential cross-account read/write paths.
- References:
	- [src/auth/decorators/get-account.decorator.ts](../../src/auth/decorators/get-account.decorator.ts)
	- [src/accounts/accounts.controller.ts](../../src/accounts/accounts.controller.ts)

### 2) Schema + Delete Coupling Auditor

- Use when: adding a new schema/domain/collection.
- Trigger phrases: `new schema`, `deleteAllByAccount`, `deleteAccount`, `cleanup coupling`.
- Scope:
	- Check domain service exposes `deleteAllByAccount(accountId)`.
	- Check `deleteAccount` cascade includes the new domain in proper order.
	- Verify no orphaned domain data remains after account deletion flow.
- References:
	- [src/admin/admin.service.ts](../../src/admin/admin.service.ts)
	- [AGENTS.md](../../AGENTS.md)

### 3) Data Migration Script Scaffold

- Use when: migrating existing data after schema/model changes.
- Trigger phrases: `migrate data`, `backfill`, `field rename`, `write migration script`.
- Scope:
	- Scaffold script pattern (`dotenv` + mongoose connect + loop + progress logging + safe exit).
	- Add dry-run style validation and summary output.
	- Keep script idempotent where possible.
- References:
	- [scripts/migrateEventTechnicians.ts](../../scripts/migrateEventTechnicians.ts)
	- [scripts/](../../scripts/)

### 4) Cascade Delete Integrity Checker

- Use when: debugging account deletion, adding related domains, or investigating orphaned documents.
- Trigger phrases: `cascade delete`, `orphan documents`, `delete order`, `account cleanup`.
- Scope:
	- Verify delete ordering in admin cascade logic.
	- Check all account-scoped domains are covered.
	- Report dependencies that may require order changes.
- References:
	- [src/admin/admin.service.ts](../../src/admin/admin.service.ts)

### 5) Deployment Diagnostics (Alpine VPS)

- Use when: deployment fails or containers do not come up on VPS.
- Trigger phrases: `deploy failed`, `alpine vps`, `docker compose error`, `ssh deployment`.
- Scope:
	- Validate prerequisites and expected environment on Alpine VPS.
	- Check deploy script assumptions and common failure points.
	- Produce a safe diagnostic checklist and recovery path.
- References:
	- [deploy.sh](../../deploy.sh)
	- [CI_CD_SETUP.md](../../CI_CD_SETUP.md)
	- [DEPLOYMENT_README.md](../../DEPLOYMENT_README.md)

### 6) RBAC Test Matrix Generator

- Use when: changing role rules, endpoint protections, or permission behavior.
- Trigger phrases: `role tests`, `rbac coverage`, `permission matrix`, `unauthorized access test`.
- Scope:
	- Generate role/action coverage cases for protected endpoints.
	- Include allowed + denied scenarios.
	- Highlight uncovered role-path combinations.
- References:
	- [src/auth/decorators/roles.decorator.ts](../../src/auth/decorators/roles.decorator.ts)
	- [src/auth/guards/roles.guard.ts](../../src/auth/guards/roles.guard.ts)
	- [test/](../../test/)

## Not Skills (Keep as Instructions/Rules)

- Preserve account isolation (`account` filtering) as a mandatory engineering rule.
- Do not change API contracts unless explicitly requested.
- Keep changes small and scoped to the request.

These belong primarily in [AGENTS.md](../../AGENTS.md), while skills here operationalize recurring workflows.

## Maintenance

- When adding a new backend domain/schema:
	- Update this catalog if a new repeatable workflow emerges.
	- Ensure related workflow references stay accurate.
- Keep trigger phrases specific and practical so skills are discoverable.
