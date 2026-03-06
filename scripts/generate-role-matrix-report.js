const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const OUTPUT = path.join(ROOT, 'ROLE_PERMISSION_MATRIX_REPORT.md');
const GLOBAL_PREFIX = '/api';

const HTTP_DECORATORS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head', 'All']);
const ROLE_COLUMNS = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'MASTER_ADMIN'];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('controller.ts')) {
      files.push(full);
    }
  }
  return files;
}

function unique(values) {
  return [...new Set(values)];
}

function getNodeDecorators(node) {
  if (typeof ts.canHaveDecorators === 'function' && ts.canHaveDecorators(node)) {
    return ts.getDecorators(node) || [];
  }
  return node.decorators || [];
}

function decoratorName(decorator) {
  if (!ts.isDecorator(decorator)) {
    return null;
  }

  const expression = decorator.expression;
  if (ts.isCallExpression(expression)) {
    const callee = expression.expression;
    if (ts.isIdentifier(callee)) {
      return callee.text;
    }
    return callee.getText();
  }

  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  return null;
}

function getDecoratorCalls(node, decoratorNameText) {
  const calls = [];
  for (const decorator of getNodeDecorators(node)) {
    const name = decoratorName(decorator);
    if (name !== decoratorNameText) {
      continue;
    }
    if (ts.isCallExpression(decorator.expression)) {
      calls.push(decorator.expression);
    }
  }
  return calls;
}

function parseStringArg(callExpression, index = 0) {
  const argument = callExpression.arguments[index];
  if (!argument) {
    return '';
  }

  if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
    return argument.text;
  }

  if (ts.isObjectLiteralExpression(argument)) {
    const pathProperty = argument.properties.find((property) => {
      return ts.isPropertyAssignment(property) && property.name.getText() === 'path';
    });

    if (pathProperty && ts.isPropertyAssignment(pathProperty)) {
      const initializer = pathProperty.initializer;
      if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
        return initializer.text;
      }
    }
  }

  return `[dynamic:${argument.getText()}]`;
}

function parseUseGuards(callExpression) {
  const guards = [];
  for (const argument of callExpression.arguments) {
    if (ts.isIdentifier(argument)) {
      guards.push(argument.text);
    } else {
      guards.push(argument.getText());
    }
  }
  return guards;
}

function parseRoles(callExpression) {
  const roles = [];
  for (const argument of callExpression.arguments) {
    if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
      roles.push(argument.text);
      continue;
    }
    roles.push(argument.getText());
  }
  return roles;
}

function normalizePathSegment(segment) {
  if (!segment || segment === '/') {
    return '';
  }
  return String(segment).replace(/^\/+|\/+$/g, '');
}

function buildPath(controllerPath, methodPath) {
  const controllerSegment = normalizePathSegment(controllerPath);
  const methodSegment = normalizePathSegment(methodPath);
  const parts = [GLOBAL_PREFIX];

  if (controllerSegment) {
    parts.push(controllerSegment);
  }

  if (methodSegment) {
    parts.push(methodSegment);
  }

  return parts.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function defaultRoleAccess(value = 'N') {
  return {
    ADMIN: value,
    SUPERVISOR: value,
    TECHNICIAN: value,
    MASTER_ADMIN: value
  };
}

function allowAllRoles() {
  return defaultRoleAccess('Y');
}

function inferPermission(endpoint) {
  const guards = endpoint.effectiveGuards;
  const methodRoles = endpoint.methodRoles;
  const classRoles = endpoint.classRoles;

  const usesJwt = guards.includes('JwtAuthGuard');
  const usesRolesGuard = guards.includes('RolesGuard');
  const usesMasterAdminGuard = guards.includes('MasterAdminGuard');
  const usesLocal = guards.includes('LocalAuthGuard');
  const usesRefresh = guards.includes('RefreshAuthGuard');
  const usesThrottler = guards.includes('ThrottlerGuard');

  const notes = [];
  let authModel = 'Public';
  let roleAllowed = defaultRoleAccess('N');

  if (usesMasterAdminGuard) {
    authModel = usesJwt ? 'JWT + MasterAdminGuard' : 'MasterAdminGuard';
    roleAllowed = defaultRoleAccess('N');
    roleAllowed.MASTER_ADMIN = 'Y';
    notes.push('Requires user.isMasterAdmin (MasterAdminGuard)');
  } else if (usesLocal) {
    authModel = 'LocalAuthGuard';
    roleAllowed = defaultRoleAccess('-');
    notes.push('Login/authentication flow endpoint (not role-scoped)');
  } else if (usesRefresh) {
    authModel = 'RefreshAuthGuard';
    roleAllowed = defaultRoleAccess('-');
    notes.push('Refresh-token flow endpoint (not role-scoped)');
  } else if (usesJwt && usesRolesGuard) {
    authModel = 'JWT + RolesGuard';

    if (methodRoles.length > 0) {
      roleAllowed = defaultRoleAccess('N');
      const recognizedRoles = methodRoles.filter((role) => ROLE_COLUMNS.includes(role));
      const unknownRoles = methodRoles.filter((role) => !ROLE_COLUMNS.includes(role));

      for (const role of recognizedRoles) {
        roleAllowed[role] = 'Y';
      }

      if (!methodRoles.includes('MASTER_ADMIN')) {
        notes.push('MASTER_ADMIN only passes if it also has one of the declared method roles');
      }

      if (unknownRoles.length > 0) {
        notes.push(`Unknown role literals in @Roles: ${unknownRoles.join(', ')}`);
      }
    } else {
      roleAllowed = allowAllRoles();
      notes.push('RolesGuard present without method-level @Roles: any authenticated role passes');
    }
  } else if (usesJwt) {
    authModel = 'JWT';
    roleAllowed = allowAllRoles();
    notes.push('Authenticated endpoint without explicit role restriction');
  } else {
    authModel = usesThrottler ? 'Public + ThrottlerGuard' : 'Public';
    roleAllowed = allowAllRoles();
    notes.push(usesThrottler ? 'Public endpoint with throttling' : 'Public endpoint');
  }

  if (classRoles.length > 0) {
    notes.push('Class-level @Roles detected; current RolesGuard reads handler metadata only');
  }

  if ((usesLocal || usesRefresh) && methodRoles.length > 0) {
    notes.push('@Roles present on auth-flow endpoint; role matrix may not apply directly');
  }

  if (methodRoles.length > 0 && !usesRolesGuard && !usesMasterAdminGuard) {
    notes.push('@Roles present but RolesGuard not detected on endpoint/class');
  }

  return {
    authModel,
    roleAllowed,
    notes: unique(notes)
  };
}

function scanControllers() {
  const files = walk(SRC_DIR);
  const endpoints = [];
  const classLevelRolesControllers = [];

  for (const file of files) {
    const sourceText = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);

    for (const statement of sourceFile.statements) {
      if (!ts.isClassDeclaration(statement) || !statement.name) {
        continue;
      }

      const controllerCalls = getDecoratorCalls(statement, 'Controller');
      if (controllerCalls.length === 0) {
        continue;
      }

      const controllerPath = parseStringArg(controllerCalls[0], 0);
      const classGuards = unique(getDecoratorCalls(statement, 'UseGuards').flatMap(parseUseGuards));
      const classRoles = unique(getDecoratorCalls(statement, 'Roles').flatMap(parseRoles));

      if (classRoles.length > 0) {
        classLevelRolesControllers.push({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          controller: statement.name.text,
          classRoles
        });
      }

      for (const member of statement.members) {
        if (!ts.isMethodDeclaration(member) || !member.name) {
          continue;
        }

        const methodDecorators = getNodeDecorators(member);
        const methodGuards = unique(getDecoratorCalls(member, 'UseGuards').flatMap(parseUseGuards));
        const methodRoles = unique(getDecoratorCalls(member, 'Roles').flatMap(parseRoles));

        for (const decorator of methodDecorators) {
          const methodDecoratorName = decoratorName(decorator);
          if (!methodDecoratorName || !HTTP_DECORATORS.has(methodDecoratorName)) {
            continue;
          }

          if (!ts.isCallExpression(decorator.expression)) {
            continue;
          }

          const methodPath = parseStringArg(decorator.expression, 0);
          const effectiveGuards = unique([...classGuards, ...methodGuards]);

          endpoints.push({
            file: path.relative(ROOT, file).replace(/\\/g, '/'),
            line: sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile)).line + 1,
            controller: statement.name.text,
            methodName: member.name.getText(sourceFile),
            httpMethod: methodDecoratorName.toUpperCase(),
            controllerPath,
            methodPath,
            path: buildPath(controllerPath, methodPath),
            classGuards,
            methodGuards,
            effectiveGuards,
            classRoles,
            methodRoles
          });
        }
      }
    }
  }

  endpoints.sort((a, b) => {
    if (a.path === b.path) {
      return a.httpMethod.localeCompare(b.httpMethod);
    }
    return a.path.localeCompare(b.path);
  });

  return {
    endpoints,
    classLevelRolesControllers
  };
}

function buildReport(scan) {
  const rows = scan.endpoints.map((endpoint) => {
    return {
      ...endpoint,
      permission: inferPermission(endpoint)
    };
  });

  const roleSummary = ROLE_COLUMNS.map((role) => {
    return {
      role,
      count: rows.filter((row) => row.permission.roleAllowed[role] === 'Y').length
    };
  });

  const generatedAt = new Date().toISOString();
  const lines = [];

  lines.push('# API Role Permission Matrix Report');
  lines.push('');
  lines.push(`Generated at: ${generatedAt}`);
  lines.push('');
  lines.push('## Scope & Method');
  lines.push('- Source scanned: all `src/**/*controller.ts` files.');
  lines.push('- Global API prefix from `main.ts`: `/api`.');
  lines.push('- Guard/role inference based on decorators and guard implementations currently in code.');
  lines.push('- Role columns: `ADMIN`, `SUPERVISOR`, `TECHNICIAN`, `MASTER_ADMIN`.');
  lines.push('');
  lines.push('## Regeneration');
  lines.push('- Run: `node ./scripts/generate-role-matrix-report.js` from backend root.');
  lines.push('- Output: `ROLE_PERMISSION_MATRIX_REPORT.md` (project root).');
  lines.push('');
  lines.push('## Quick Summary');
  lines.push(`- Total endpoints found: **${rows.length}**`);
  lines.push(`- Controllers scanned: **${new Set(rows.map((row) => row.controller)).size}**`);
  lines.push('- Endpoints allowed per role (`Y` entries):');
  for (const item of roleSummary) {
    lines.push(`  - ${item.role}: ${item.count}`);
  }
  lines.push('');
  lines.push('## Role x Endpoint Matrix');
  lines.push('| Method | Endpoint | Auth Model | ADMIN | SUPERVISOR | TECHNICIAN | MASTER_ADMIN | Roles Decorator | Notes |');
  lines.push('|---|---|---|---|---|---|---|---|---|');

  for (const row of rows) {
    const rolesDecorator = row.methodRoles.length
      ? row.methodRoles.join(', ')
      : row.classRoles.length
        ? `class: ${row.classRoles.join(', ')}`
        : '-';
    const notes = row.permission.notes.length ? row.permission.notes.join(' ; ') : '-';

    lines.push(
      `| ${row.httpMethod} | ${row.path} | ${row.permission.authModel} | ${row.permission.roleAllowed.ADMIN} | ${row.permission.roleAllowed.SUPERVISOR} | ${row.permission.roleAllowed.TECHNICIAN} | ${row.permission.roleAllowed.MASTER_ADMIN} | ${rolesDecorator} | ${notes} |`
    );
  }

  lines.push('');
  lines.push('## Exceptions & Important Notes');
  lines.push('- `RolesGuard` currently checks role metadata only on handlers (`context.getHandler()`), not class metadata.');
  lines.push('- `MasterAdminGuard` enforces `user.isMasterAdmin`, independent from role strings in `@Roles(...)`.');
  lines.push('- Endpoints marked `JWT` or `JWT + RolesGuard` can still have additional service-level constraints (account isolation, ownership, business rules).');
  lines.push('- `LocalAuthGuard` and `RefreshAuthGuard` rows are auth-flow endpoints and are marked `-` in role columns because they are not role-scoped checks.');

  if (scan.classLevelRolesControllers.length > 0) {
    lines.push('- Class-level `@Roles(...)` detected (verify enforcement because current RolesGuard is handler-only):');
    for (const item of scan.classLevelRolesControllers) {
      lines.push(`  - ${item.file} (${item.controller}) -> ${item.classRoles.join(', ')}`);
    }
  } else {
    lines.push('- No class-level `@Roles(...)` decorators detected in scanned controllers.');
  }

  lines.push('');
  lines.push('## Endpoint Source Index');
  lines.push('| Method | Endpoint | Source |');
  lines.push('|---|---|---|');
  for (const row of rows) {
    lines.push(`| ${row.httpMethod} | ${row.path} | ${row.file}:${row.line} (${row.controller}.${row.methodName}) |`);
  }

  return lines.join('\n');
}

const scan = scanControllers();
const report = buildReport(scan);

fs.writeFileSync(OUTPUT, report, 'utf8');
console.log(`Report generated: ${OUTPUT}`);
console.log(`Endpoints: ${scan.endpoints.length}`);
