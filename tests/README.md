# Backend tests

Requires Node.js 22.8 or newer. The suite uses `node:test`, `node:assert/strict`, and `node:http`. Reporting uses the development dependencies [`c8`](https://github.com/bcoe/c8) and [`node-reporter-sonarqube`](https://github.com/sjinks/node-reporter-sonarqube), configured directly in `package.json`.

Before the first run, install the new development dependencies and update the lockfile:

```sh
npm install --include=dev
```

Commit the resulting `package-lock.json` update before using `npm ci` in CI or Docker builds. The dependency install has not been run in this session.

Run from the repository root:

```sh
npm test
npm run test:coverage
```

Both commands run the behavioral assertions, show test results and a coverage summary in the terminal, and write these files:

| Generated file | Purpose | SonarQube parameter |
| --- | --- | --- |
| `coverage/lcov.info` | Backend line, branch, and function coverage | `sonar.javascript.lcov.reportPaths` |
| `test-report.xml` | Test names, durations, passes, failures, and skips in Sonar's generic format | `sonar.testExecutionReportPaths` |

`npm run test` and `npm test` are equivalent. `npm run test:coverage` runs the same tests and then uses `c8 check-coverage` to require 100% lines, branches, and functions for backend source files, exiting with failure for missed thresholds. The `c8` coverage scope includes `app.js`, `server.js`, and all JavaScript under `routes`, `controllers`, `middleware`, `services`, `modals`, and `utils`; frontend, scripts, test helpers, and third-party dependencies are outside backend coverage scope. `all: true` includes backend source files that tests never load as uncovered. There are no source coverage-ignore directives.

The `test` command runs `tests/*.test.js` sequentially with Node's built-in test runner. `c8` creates the coverage directory and writes LCOV; `node-reporter-sonarqube` writes generic execution XML directly to the repository root. Test failures retain a nonzero exit code while completed runs still produce reports. Generated reports and scanner working files are ignored by Git. No custom runner, reporter, or TypeScript loader is used.

The root `sonar-project.properties` points the scanner to these files and limits analysis to the backend. Run the scanner from the repository root after tests; see [`scripts/SONARQUBE.md`](../scripts/SONARQUBE.md) for project identity, environment variables, and CI setup.

**Verification status:** these files were written and reviewed without running commands other than file reads, as requested. No passing test result or measured coverage percentage is claimed. The strict command may fail until its first run identifies any remaining test failures or coverage gaps.

## API test map

| Method | Endpoint | Tests |
| --- | --- | --- |
| GET | `/api/health` | `health.api.test.js`: successful ping, non-ready states, failures, timeout, recovery, safe response |
| GET / HEAD | `/api/health/live` | `health.api.test.js`: public liveness without MongoDB, metadata, cache policy |
| POST | `/api/user/register` | `user.api.test.js`: input validation, duplicate accounts, regular-role enforcement, cookie, database failures |
| POST | `/api/user/login` | `user.api.test.js`: credentials, disabled accounts, cookie policy, safe identity fields |
| POST | `/api/user/logout` | `user.api.test.js`: clearing session cookie |
| GET | `/api/user/getuser` | `user.api.test.js`, `auth.api.test.js`: identity, legacy roles, fresh account status, JWT rejection |
| PATCH | `/api/user/password` | `user.api.test.js`: length/type/confirmation checks, current password, reuse, save and deletion races |
| GET | `/api/user/profile-photo` | `user.api.test.js`: image bytes, private cache headers, missing images |
| POST | `/api/user/profile-photo` | `user.api.test.js`: JPEG/PNG/WebP signatures, MIME mismatch, file size/count, multipart errors |
| DELETE | `/api/user/profile-photo` | `user.api.test.js`: removal, database errors |
| GET | `/api/user/admin/users` | `admin.api.test.js`: field projection, legacy defaults, database errors |
| PATCH | `/api/user/admin/users/:id` | `admin.api.test.js`: allowlist, self-access preservation, validation, duplicates, missing accounts |
| GET | `/api/inventory/getitems` | `inventory.api.test.js`: archived filter, populated attribution, failures |
| POST | `/api/inventory/addtoinventory` | `inventory.api.test.js`: identity normalization, literal regex matching, opening stock, actor, duplicates |
| POST | `/api/inventory/addstock/:id` | `inventory.api.test.js`: atomic increment request, active filter, restock attribution, validation |
| PATCH | `/api/inventory/archive/:id` | `inventory.api.test.js`: archive actor/time, preserved history, missing items |
| PATCH | `/api/inventory/restore/:id` | `inventory.api.test.js`: restore actor/time, missing items |
| GET | `/api/customer` | `customer.api.test.js`: archived filter and database failures |
| POST | `/api/customer` | `customer.api.test.js`: normalized contacts, authenticated creator, duplicate races |
| PUT | `/api/customer/:id` | `customer.api.test.js`: update attribution, creator preservation, clearing optional contacts, validation |
| DELETE | `/api/customer/:id` | `customer.api.test.js`: archive billed customers, delete unreferenced customers, actor/time |
| POST | `/api/customer/:id/restore` | `customer.api.test.js`: restoring actor/time, invalid/missing customers |
| POST | `/api/bill/newbill` | `billing.api.test.js`: merged lines, trusted prices, rounding, bill creator, stock filters, compensation |
| GET | `/api/bill/allbills` | `billing.api.test.js`: bill history and database errors |
| GET | `/api/analytics/sales` | `analytics.api.test.js`: validation, IST date windows, previous periods, empty buckets, sorting, search, pagination |
| GET | `/api/analytics/sales/export` | `analytics.api.test.js`: CSV headers/encoding/escaping, formula protection, comparisons, failures |
| GET | `/` | `app.test.js`: root response |

`auth.api.test.js` checks anonymous rejection on protected endpoints and rejects non-admin access on user-management APIs. `admin.api.test.js` additionally checks admin-only photo access. `app.test.js` also covers CORS, preflight, unknown routes, and malformed JSON. Health tests replace the connection state and ping with isolated fixtures and never connect to a real database.

## Additional layers

- `customer.service.test.js` checks identity conflicts, archived customers, contact enrichment, attribution, and duplicate-save races.
- `models.test.js` runs actual schema validators and user save hooks, including hashing, unchanged-password preservation, replacements, and timestamps. Index declarations are checked; no index is created in MongoDB.
- `middleware.test.js` checks tracing validation/propagation, finish-event logging, errors, status precedence, and development stack visibility.
- `controllers.test.js` checks isolated controller use without a request logger and error propagation that HTTP requests cannot reliably trigger.
- `logger.test.js` evaluates the logger configuration in an isolated module context and writes to an in-memory destination to verify levels, environment defaults, and credential redaction.
- `server.test.js` evaluates startup with isolated dependencies to verify import safety, database-before-listen ordering, connection/listening errors, and the executable entry point. It never opens a real database connection.

## Isolation and limits

API tests exercise real HTTP routing, cookies, JSON parsing, JWT verification, multipart parsing, controllers, and services. Each test receives its own loopback listener and restores mocks and environment changes afterward. Unexpected database methods fail immediately; requests time out rather than hanging. Tests use a dedicated signing secret, fixed ObjectIds, and a frozen analytics clock.

Mongoose query mocks record filters, update arguments, population paths, and field selections, and return fixture data. They do not execute MongoDB queries. In particular, aggregation facets use fixture results: the tests validate report processing and date-window construction, not the database's calculation of those fixtures. Unique index enforcement, actual population/projection behavior, transactions, and concurrency require a separate MongoDB integration suite against a disposable test database.

Keep test files sequential when sharing method mocks within a process. `--test-concurrency=1` makes the intended execution order explicit, and tests restore their individual mocks automatically.
