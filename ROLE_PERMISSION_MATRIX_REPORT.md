# API Role Permission Matrix Report

Generated at: 2026-03-06T15:55:59.202Z

## Scope & Method
- Source scanned: all `src/**/*controller.ts` files.
- Global API prefix from `main.ts`: `/api`.
- Guard/role inference based on decorators and guard implementations currently in code.
- Role columns: `ADMIN`, `SUPERVISOR`, `TECHNICIAN`, `MASTER_ADMIN`.

## Regeneration
- Run: `node ./scripts/generate-role-matrix-report.js` from backend root.
- Output: `ROLE_PERMISSION_MATRIX_REPORT.md` (project root).

## Quick Summary
- Total endpoints found: **118**
- Controllers scanned: **25**
- Endpoints allowed per role (`Y` entries):
  - ADMIN: 111
  - SUPERVISOR: 92
  - TECHNICIAN: 51
  - MASTER_ADMIN: 43

## Role x Endpoint Matrix
| Method | Endpoint | Auth Model | ADMIN | SUPERVISOR | TECHNICIAN | MASTER_ADMIN | Roles Decorator | Notes |
|---|---|---|---|---|---|---|---|---|
| GET | /api/accounts/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/accounts/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/accounts/:id/logo | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/accounts/customizations | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/admin/accounts | JWT + MasterAdminGuard | N | N | N | Y | - | Requires user.isMasterAdmin (MasterAdminGuard) |
| DELETE | /api/admin/accounts/:id | JWT + MasterAdminGuard | N | N | N | Y | - | Requires user.isMasterAdmin (MasterAdminGuard) |
| PUT | /api/admin/accounts/:id | JWT + MasterAdminGuard | N | N | N | Y | - | Requires user.isMasterAdmin (MasterAdminGuard) |
| PUT | /api/admin/accounts/:id/status | JWT + MasterAdminGuard | N | N | N | Y | - | Requires user.isMasterAdmin (MasterAdminGuard) |
| GET | /api/admin/accounts/:id/summary | JWT + MasterAdminGuard | N | N | N | Y | - | Requires user.isMasterAdmin (MasterAdminGuard) |
| POST | /api/auth/forgot-password | Public | Y | Y | Y | Y | - | Public endpoint |
| POST | /api/auth/login | LocalAuthGuard | - | - | - | - | - | Login/authentication flow endpoint (not role-scoped) |
| POST | /api/auth/logout | Public | Y | Y | Y | Y | - | Public endpoint |
| POST | /api/auth/refresh | RefreshAuthGuard | - | - | - | - | - | Refresh-token flow endpoint (not role-scoped) |
| POST | /api/auth/reset-password | Public | Y | Y | Y | Y | - | Public endpoint |
| GET | /api/contracts | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/contracts | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/contracts/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/contracts/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/contracts/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/customers | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/customers | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/customers/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/customers/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/customers/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/customers/:id/equipments/:equipmentId/pictures/:index | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/customers/:id/equipments/:equipmentIndex/pictures | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/customers/:id/notes | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/customers/:id/notes/:noteId | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/customers/:id/notes/:noteId | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/customers/:id/pictures | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/customers/:id/pictures/:pictureId | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/dashboard/stats | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/equipment-types | JWT | Y | Y | Y | Y | - | Authenticated endpoint without explicit role restriction |
| GET | /api/equipment-types/:id | JWT | Y | Y | Y | Y | - | Authenticated endpoint without explicit role restriction |
| GET | /api/events | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/events | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/events/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/events/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/events/:id | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PATCH | /api/events/:id/complete | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/events/paginated | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| GET | /api/expenses | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/expenses | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/expenses/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/expenses/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/expenses/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/expenses/stats | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/follow-ups | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/follow-ups | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/follow-ups/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/follow-ups/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/follow-ups/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/health | Public | Y | Y | Y | Y | - | Public endpoint |
| GET | /api/payments | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/payments/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/payments/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/payments/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/payments/from-service-order | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/products | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/products | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/products/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/products/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/products/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/prospecting/businesses/:id/calls | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/prospecting/businesses/:id/calls | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/prospecting/businesses/statuses | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/prospecting/businesses/upsert | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/public-accounts | Public + ThrottlerGuard | Y | Y | Y | Y | - | Public endpoint with throttling |
| POST | /api/public-accounts/resend-verification | Public + ThrottlerGuard | Y | Y | Y | Y | - | Public endpoint with throttling |
| POST | /api/public-accounts/verify-email | Public + ThrottlerGuard | Y | Y | Y | Y | - | Public endpoint with throttling |
| GET | /api/public/quotes/approve/:token | Public + ThrottlerGuard | Y | Y | Y | Y | - | Public endpoint with throttling |
| POST | /api/public/quotes/approve/:token | Public + ThrottlerGuard | Y | Y | Y | Y | - | Public endpoint with throttling |
| GET | /api/quotes | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/quotes | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/quotes/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/quotes/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PATCH | /api/quotes/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/quotes/:id | JWT + RolesGuard | Y | Y | Y | N | ADMIN, SUPERVISOR, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/quotes/:id/send | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/roles | JWT | Y | Y | Y | Y | - | Authenticated endpoint without explicit role restriction |
| GET | /api/service-orders | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/service-orders | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/service-orders/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/service-orders/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/service-orders/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/service-orders/:id/change-orders | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| PUT | /api/service-orders/:id/change-orders/:version | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/service-orders/by-customer/:customerId | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/service-orders/from-quote | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/services | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/services | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/services/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/services/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/services/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/technicians | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/technicians | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/technicians/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/technicians/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/technicians/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/users | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/users | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/users/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/users/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PATCH | /api/users/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/users/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/users/:id/profile-picture | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| GET | /api/vehicle-usages | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/vehicle-usages | JWT + RolesGuard | Y | Y | Y | N | TECHNICIAN, SUPERVISOR, ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/vehicle-usages/:id | JWT + RolesGuard | Y | N | N | N | ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/vehicle-usages/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PATCH | /api/vehicle-usages/:id | JWT + RolesGuard | Y | Y | Y | N | SUPERVISOR, ADMIN, TECHNICIAN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| POST | /api/vehicle-usages/:id/approve | JWT + RolesGuard | Y | Y | N | N | SUPERVISOR, ADMIN | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/vehicles | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| POST | /api/vehicles | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| DELETE | /api/vehicles/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/vehicles/:id | JWT + RolesGuard | Y | Y | Y | Y | - | RolesGuard present without method-level @Roles: any authenticated role passes |
| PUT | /api/vehicles/:id | JWT + RolesGuard | Y | Y | N | N | ADMIN, SUPERVISOR | MASTER_ADMIN only passes if it also has one of the declared method roles |
| GET | /api/weather | JWT | Y | Y | Y | Y | - | Authenticated endpoint without explicit role restriction |

## Exceptions & Important Notes
- `RolesGuard` currently checks role metadata only on handlers (`context.getHandler()`), not class metadata.
- `MasterAdminGuard` enforces `user.isMasterAdmin`, independent from role strings in `@Roles(...)`.
- Endpoints marked `JWT` or `JWT + RolesGuard` can still have additional service-level constraints (account isolation, ownership, business rules).
- `LocalAuthGuard` and `RefreshAuthGuard` rows are auth-flow endpoints and are marked `-` in role columns because they are not role-scoped checks.
- No class-level `@Roles(...)` decorators detected in scanned controllers.

## Endpoint Source Index
| Method | Endpoint | Source |
|---|---|---|
| GET | /api/accounts/:id | src/accounts/accounts.controller.ts:36 (AccountsController.findById) |
| PUT | /api/accounts/:id | src/accounts/accounts.controller.ts:46 (AccountsController.update) |
| POST | /api/accounts/:id/logo | src/accounts/accounts.controller.ts:56 (AccountsController.uploadLogo) |
| GET | /api/accounts/customizations | src/accounts/accounts.controller.ts:29 (AccountsController.getCustomizations) |
| GET | /api/admin/accounts | src/admin/admin.controller.ts:15 (AdminController.findAll) |
| DELETE | /api/admin/accounts/:id | src/admin/admin.controller.ts:38 (AdminController.deleteAccount) |
| PUT | /api/admin/accounts/:id | src/admin/admin.controller.ts:33 (AdminController.updateAccount) |
| PUT | /api/admin/accounts/:id/status | src/admin/admin.controller.ts:28 (AdminController.updateAccountStatus) |
| GET | /api/admin/accounts/:id/summary | src/admin/admin.controller.ts:23 (AdminController.getAccountSummary) |
| POST | /api/auth/forgot-password | src/auth/auth.controller.ts:44 (AuthController.forgotPassword) |
| POST | /api/auth/login | src/auth/auth.controller.ts:30 (AuthController.login) |
| POST | /api/auth/logout | src/auth/auth.controller.ts:55 (AuthController.logout) |
| POST | /api/auth/refresh | src/auth/auth.controller.ts:37 (AuthController.refresh) |
| POST | /api/auth/reset-password | src/auth/auth.controller.ts:49 (AuthController.resetPassword) |
| GET | /api/contracts | src/contracts/contracts.controller.ts:29 (ContractsController.findAll) |
| POST | /api/contracts | src/contracts/contracts.controller.ts:15 (ContractsController.create) |
| DELETE | /api/contracts/:id | src/contracts/contracts.controller.ts:63 (ContractsController.remove) |
| GET | /api/contracts/:id | src/contracts/contracts.controller.ts:45 (ContractsController.findOne) |
| PUT | /api/contracts/:id | src/contracts/contracts.controller.ts:51 (ContractsController.update) |
| GET | /api/customers | src/customers/customers.controller.ts:48 (CustomersController.findAll) |
| POST | /api/customers | src/customers/customers.controller.ts:26 (CustomersController.create) |
| DELETE | /api/customers/:id | src/customers/customers.controller.ts:103 (CustomersController.remove) |
| GET | /api/customers/:id | src/customers/customers.controller.ts:63 (CustomersController.findOne) |
| PUT | /api/customers/:id | src/customers/customers.controller.ts:68 (CustomersController.update) |
| DELETE | /api/customers/:id/equipments/:equipmentId/pictures/:index | src/customers/customers.controller.ts:188 (CustomersController.deleteEquipmentPicture) |
| POST | /api/customers/:id/equipments/:equipmentIndex/pictures | src/customers/customers.controller.ts:109 (CustomersController.uploadEquipmentPicture) |
| POST | /api/customers/:id/notes | src/customers/customers.controller.ts:79 (CustomersController.addNote) |
| DELETE | /api/customers/:id/notes/:noteId | src/customers/customers.controller.ts:97 (CustomersController.deleteNote) |
| PUT | /api/customers/:id/notes/:noteId | src/customers/customers.controller.ts:85 (CustomersController.updateNote) |
| POST | /api/customers/:id/pictures | src/customers/customers.controller.ts:200 (CustomersController.uploadCustomerPicture) |
| DELETE | /api/customers/:id/pictures/:pictureId | src/customers/customers.controller.ts:278 (CustomersController.deleteCustomerPicture) |
| GET | /api/dashboard/stats | src/dashboard/dashboard.controller.ts:13 (DashboardController.getStats) |
| GET | /api/equipment-types | src/equipmentType/equipment-type.controller.ts:10 (EquipmentTypeController.findAll) |
| GET | /api/equipment-types/:id | src/equipmentType/equipment-type.controller.ts:15 (EquipmentTypeController.findOne) |
| GET | /api/events | src/events/events.controller.ts:38 (EventsController.findAll) |
| POST | /api/events | src/events/events.controller.ts:16 (EventsController.create) |
| DELETE | /api/events/:id | src/events/events.controller.ts:103 (EventsController.delete) |
| GET | /api/events/:id | src/events/events.controller.ts:69 (EventsController.findOne) |
| PUT | /api/events/:id | src/events/events.controller.ts:74 (EventsController.update) |
| PATCH | /api/events/:id/complete | src/events/events.controller.ts:119 (EventsController.complete) |
| GET | /api/events/paginated | src/events/events.controller.ts:59 (EventsController.findAllPaginated) |
| GET | /api/expenses | src/expenses/expenses.controller.ts:22 (ExpensesController.findAll) |
| POST | /api/expenses | src/expenses/expenses.controller.ts:16 (ExpensesController.create) |
| DELETE | /api/expenses/:id | src/expenses/expenses.controller.ts:81 (ExpensesController.remove) |
| GET | /api/expenses/:id | src/expenses/expenses.controller.ts:56 (ExpensesController.findOne) |
| PUT | /api/expenses/:id | src/expenses/expenses.controller.ts:68 (ExpensesController.update) |
| GET | /api/expenses/stats | src/expenses/expenses.controller.ts:39 (ExpensesController.getStats) |
| GET | /api/follow-ups | src/follow-ups/follow-ups.controller.ts:29 (FollowUpsController.findAll) |
| POST | /api/follow-ups | src/follow-ups/follow-ups.controller.ts:15 (FollowUpsController.create) |
| DELETE | /api/follow-ups/:id | src/follow-ups/follow-ups.controller.ts:76 (FollowUpsController.delete) |
| GET | /api/follow-ups/:id | src/follow-ups/follow-ups.controller.ts:50 (FollowUpsController.findOne) |
| PUT | /api/follow-ups/:id | src/follow-ups/follow-ups.controller.ts:56 (FollowUpsController.update) |
| GET | /api/health | src/app.controller.ts:5 (AppController.getHealth) |
| GET | /api/payments | src/payments/payments.controller.ts:25 (PaymentsController.findAll) |
| DELETE | /api/payments/:id | src/payments/payments.controller.ts:54 (PaymentsController.remove) |
| GET | /api/payments/:id | src/payments/payments.controller.ts:37 (PaymentsController.findOne) |
| PUT | /api/payments/:id | src/payments/payments.controller.ts:43 (PaymentsController.update) |
| POST | /api/payments/from-service-order | src/payments/payments.controller.ts:15 (PaymentsController.createFromServiceOrder) |
| GET | /api/products | src/products/products.controller.ts:27 (ProductsController.findAll) |
| POST | /api/products | src/products/products.controller.ts:15 (ProductsController.create) |
| DELETE | /api/products/:id | src/products/products.controller.ts:55 (ProductsController.remove) |
| GET | /api/products/:id | src/products/products.controller.ts:40 (ProductsController.findOne) |
| PUT | /api/products/:id | src/products/products.controller.ts:45 (ProductsController.update) |
| GET | /api/prospecting/businesses/:id/calls | src/prospecting/prospecting.controller.ts:28 (ProspectingController.getBusinessCalls) |
| POST | /api/prospecting/businesses/:id/calls | src/prospecting/prospecting.controller.ts:34 (ProspectingController.createCall) |
| POST | /api/prospecting/businesses/statuses | src/prospecting/prospecting.controller.ts:22 (ProspectingController.getStatuses) |
| POST | /api/prospecting/businesses/upsert | src/prospecting/prospecting.controller.ts:16 (ProspectingController.upsertBusiness) |
| POST | /api/public-accounts | src/accounts/public-accounts.controller.ts:39 (PublicAccountsController.create) |
| POST | /api/public-accounts/resend-verification | src/accounts/public-accounts.controller.ts:198 (PublicAccountsController.resendVerification) |
| POST | /api/public-accounts/verify-email | src/accounts/public-accounts.controller.ts:150 (PublicAccountsController.verifyEmail) |
| GET | /api/public/quotes/approve/:token | src/quotes/public-quotes.controller.ts:10 (PublicQuotesController.getQuoteForApproval) |
| POST | /api/public/quotes/approve/:token | src/quotes/public-quotes.controller.ts:38 (PublicQuotesController.approveQuote) |
| GET | /api/quotes | src/quotes/quotes.controller.ts:47 (QuotesController.findAll) |
| POST | /api/quotes | src/quotes/quotes.controller.ts:19 (QuotesController.create) |
| DELETE | /api/quotes/:id | src/quotes/quotes.controller.ts:105 (QuotesController.remove) |
| GET | /api/quotes/:id | src/quotes/quotes.controller.ts:63 (QuotesController.findOne) |
| PATCH | /api/quotes/:id | src/quotes/quotes.controller.ts:98 (QuotesController.updatePartial) |
| PUT | /api/quotes/:id | src/quotes/quotes.controller.ts:68 (QuotesController.update) |
| PUT | /api/quotes/:id/send | src/quotes/quotes.controller.ts:92 (QuotesController.send) |
| GET | /api/roles | src/roles/roles.controller.ts:10 (RolesController.findAll) |
| GET | /api/service-orders | src/service-orders/service-orders.controller.ts:40 (ServiceOrdersController.findAll) |
| POST | /api/service-orders | src/service-orders/service-orders.controller.ts:22 (ServiceOrdersController.create) |
| DELETE | /api/service-orders/:id | src/service-orders/service-orders.controller.ts:80 (ServiceOrdersController.delete) |
| GET | /api/service-orders/:id | src/service-orders/service-orders.controller.ts:60 (ServiceOrdersController.findOne) |
| PUT | /api/service-orders/:id | src/service-orders/service-orders.controller.ts:65 (ServiceOrdersController.update) |
| POST | /api/service-orders/:id/change-orders | src/service-orders/service-orders.controller.ts:86 (ServiceOrdersController.createChangeOrder) |
| PUT | /api/service-orders/:id/change-orders/:version | src/service-orders/service-orders.controller.ts:111 (ServiceOrdersController.approveOrRejectChangeOrder) |
| GET | /api/service-orders/by-customer/:customerId | src/service-orders/service-orders.controller.ts:55 (ServiceOrdersController.findByCustomer) |
| POST | /api/service-orders/from-quote | src/service-orders/service-orders.controller.ts:34 (ServiceOrdersController.createFromQuote) |
| GET | /api/services | src/services/services.controller.ts:27 (ServicesController.findAll) |
| POST | /api/services | src/services/services.controller.ts:15 (ServicesController.create) |
| DELETE | /api/services/:id | src/services/services.controller.ts:55 (ServicesController.remove) |
| GET | /api/services/:id | src/services/services.controller.ts:40 (ServicesController.findOne) |
| PUT | /api/services/:id | src/services/services.controller.ts:45 (ServicesController.update) |
| GET | /api/technicians | src/technicians/technicians.controller.ts:52 (TechniciansController.findAll) |
| POST | /api/technicians | src/technicians/technicians.controller.ts:21 (TechniciansController.create) |
| DELETE | /api/technicians/:id | src/technicians/technicians.controller.ts:113 (TechniciansController.remove) |
| GET | /api/technicians/:id | src/technicians/technicians.controller.ts:66 (TechniciansController.findOne) |
| PUT | /api/technicians/:id | src/technicians/technicians.controller.ts:82 (TechniciansController.update) |
| GET | /api/users | src/users/users.controller.ts:61 (UsersController.findAll) |
| POST | /api/users | src/users/users.controller.ts:44 (UsersController.create) |
| DELETE | /api/users/:id | src/users/users.controller.ts:166 (UsersController.remove) |
| GET | /api/users/:id | src/users/users.controller.ts:105 (UsersController.findOne) |
| PATCH | /api/users/:id | src/users/users.controller.ts:155 (UsersController.updateLanguage) |
| PUT | /api/users/:id | src/users/users.controller.ts:120 (UsersController.update) |
| POST | /api/users/:id/profile-picture | src/users/users.controller.ts:176 (UsersController.uploadProfilePicture) |
| GET | /api/vehicle-usages | src/vehicle-usages/vehicle-usages.controller.ts:30 (VehicleUsagesController.findAll) |
| POST | /api/vehicle-usages | src/vehicle-usages/vehicle-usages.controller.ts:15 (VehicleUsagesController.create) |
| DELETE | /api/vehicle-usages/:id | src/vehicle-usages/vehicle-usages.controller.ts:63 (VehicleUsagesController.remove) |
| GET | /api/vehicle-usages/:id | src/vehicle-usages/vehicle-usages.controller.ts:35 (VehicleUsagesController.findOne) |
| PATCH | /api/vehicle-usages/:id | src/vehicle-usages/vehicle-usages.controller.ts:42 (VehicleUsagesController.update) |
| POST | /api/vehicle-usages/:id/approve | src/vehicle-usages/vehicle-usages.controller.ts:55 (VehicleUsagesController.approve) |
| GET | /api/vehicles | src/vehicles/vehicles.controller.ts:28 (VehiclesController.findAll) |
| POST | /api/vehicles | src/vehicles/vehicles.controller.ts:15 (VehiclesController.create) |
| DELETE | /api/vehicles/:id | src/vehicles/vehicles.controller.ts:63 (VehiclesController.remove) |
| GET | /api/vehicles/:id | src/vehicles/vehicles.controller.ts:43 (VehiclesController.findOne) |
| PUT | /api/vehicles/:id | src/vehicles/vehicles.controller.ts:50 (VehiclesController.update) |
| GET | /api/weather | src/weather/weather.controller.ts:10 (WeatherController.getWeather) |