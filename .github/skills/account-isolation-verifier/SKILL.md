---
name: account-isolation-verifier
description: 'Verify tenant account isolation in NestJS controllers and services. Use for new endpoints, query changes, account filter reviews, or suspected cross-account data leaks. Triggers: account isolation, missing account filter, tenant leak, GetAccountId, controller review.'
argument-hint: 'Provide files or modules to audit, plus whether this is a new endpoint or a bugfix.'
user-invocable: true
---

# Account Isolation Verifier

Prevents cross-account data access by validating request scoping from controller entry points down to persistence queries.

## When to Use

- You added or modified a controller endpoint.
- You changed service query logic or aggregation pipelines.
- You are fixing a suspected tenant data leak.
- You want a safety review before merging account-scoped changes.

## Inputs Expected

- Target modules or files to audit.
- Whether the change is create, read, update, or delete.
- Any known constraints (for example admin-only route behavior).

## Procedure

1. Identify all affected routes and confirm account context extraction.
- Confirm each protected route uses `@GetAccountId()` where account scope is required.
- Confirm account id variable is passed to service methods without dropping scope.

2. Trace account id flow from controller to service.
- Verify service method signatures receive account id when needed.
- Verify no alternate code path bypasses account-scoped service methods.

3. Validate database scoping in queries.
- Ensure find/update/delete operations include account filtering for account-scoped data.
- Ensure aggregation pipelines include account match early where appropriate.
- Flag calls that only filter by external ids without account constraints.

4. Check id-based access controls.
- For routes with `:id`, verify id-to-account ownership checks are enforced where needed.
- Confirm forbidden access behavior is explicit and consistent.

5. Verify role constraints are not used as a substitute for account scoping.
- `@Roles(...)` is complementary; account filtering remains mandatory for tenant data.

6. Produce an audit report.
- List reviewed endpoints and query paths.
- List findings by severity with file references.
- Provide concrete code fixes and minimal test recommendations.

## Quick Checks

- Controller example with account extraction:
  - [../../src/accounts/accounts.controller.ts](../../src/accounts/accounts.controller.ts)
- Decorator source:
  - [../../src/auth/decorators/get-account.decorator.ts](../../src/auth/decorators/get-account.decorator.ts)
- Project guardrail:
  - [../../AGENTS.md](../../AGENTS.md)

## Output Format

- Summary: pass/fail per module audited.
- Findings: critical, high, medium, low.
- Fixes: exact file-level change suggestions.
- Tests: list of account isolation test cases to add or update.

## Boundaries

- Do not change API contracts unless explicitly requested.
- Keep fixes scoped to the affected modules.
- Preserve existing NestJS patterns and account isolation rules.
