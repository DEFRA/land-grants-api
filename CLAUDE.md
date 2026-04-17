# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev             # Start dev server with hot reload (port 3001)
npm run dev:setup       # One-time local setup (DB, migrations, seed data) — requires Docker

# Build
npm run build           # Transpile to .server/ via Babel (required before npm start)
npm start               # Run production build

# Linting & Formatting
npm run lint            # ESLint + TypeScript type checking
npm run lint:fix        # Auto-fix lint issues
npm run format          # Prettier formatting

# Testing
npm test                # All test suites with merged coverage
npm run test:unit       # Unit tests only (fast, no Docker)
npm run test:quick      # Unit tests without coverage (best for use with tail bash command)
npm run test:db         # DB integration tests (requires Docker)
npm run test:e2e        # End-to-end tests (requires Docker)
npm run test:fixtures:generate  # Regenerate AAC snapshot fixtures

# Run a single test file
npx vitest run src/features/available-area/available-area.test.js

# Database migrations
npm run docker:migrate:up
npm run docker:migrate:down
```

Local dev requires Docker running for PostgreSQL 16+PostGIS and LocalStack (S3 mock) via `compose.yml`.

## Architecture

**Hapi.js plugin-based API** serving a UK government farming grants platform. The server is assembled in `src/routes/index.js`, which loads plugins and registers feature routes.

### Feature Module Pattern

Each feature in `src/features/` follows this structure:

```
feature/
├── index.js          # Hapi plugin registration
├── controllers/      # HTTP request handlers
├── queries/          # DB SELECT operations
├── mutations/        # DB INSERT/UPDATE operations
├── schema/           # Joi validation schemas
├── service/          # Business logic
├── transformers/     # Data transformation
└── fixtures/         # Test data
```

### Key Features

**Available Area Calculation (AAC)** (`src/features/available-area/`) — The most complex domain logic. Calculates maximum eligible land area for new environmental actions given existing action allocations. Uses an "ephemeral stacking" algorithm (described in `docs/aac-specification.md`) to logically arrange compatible actions and minimize footprint without exact geographic coordinates.

**Rules Engine** (`src/features/rules-engine/`) — Versioned business rule execution. Rules live under `rules/1.0.0/` and can be extended to new versions without breaking existing behaviour.

**Land Data Ingest** (`src/features/land-data-ingest/`) — ETL pipeline for CSV files via AWS S3. Uses Node.js worker threads (`workers/`) to offload CSV parsing. Three ingestion paths: bulk Day 1 import, CDP Uploader callbacks, and a cron-based S3 poller fallback.

**Compatibility Matrix** (`src/features/compatibility-matrix/`) — Defines which environmental actions can coexist on the same land parcel. Used by the AAC and application validation.

**Case Management Adapter** (`src/features/case-management-adapter/`) — Integration layer to an external case management system.

### Cross-Cutting Concerns (`src/features/common/`)

- `auth.js` — Service-to-service bearer token + AES encryption
- `s3-client.js` — AWS SDK v3 S3 integration
- `postgresDb` — PostgreSQL via `@hapi/shot` pool; read replica supported via separate `POSTGRES_HOST_READ`
- `requestLogger`, `requestTracing` — Pino ECS-formatted logging; propagates `x-cdp-request-id` header
- `statistics.js` — Usage metrics cron jobs

### Database

PostgreSQL 16 + PostGIS. Schema managed by Liquibase (`changelog/db.changelog-*.xml`, 80+ migrations). Production uses AWS RDS IAM token auth; local/test uses password auth. Spatial queries use PostGIS for parcel boundary overlap calculations.

### Configuration

Convict-based config in `src/config/index.js`. All env vars are validated at startup. Key sections: `postgres`, `s3`, `auth`, `ingest`, `log`, `httpProxy`.

## Testing

| Type           | Config                      | Location                    | Notes                     |
| -------------- | --------------------------- | --------------------------- | ------------------------- |
| Unit           | `vitest.unit.config.js`     | `src/features/**/*.test.js` | No DB, no Docker          |
| DB integration | `vitest.db.config.js`       | `src/tests/db-tests/`       | Testcontainers (Postgres) |
| E2E            | `vitest.e2e.config.js`      | `src/tests/e2e-tests/`      | Full server lifecycle     |
| Contract       | `vitest.contract.config.js` | `src/tests/contract-tests/` | Pact consumer/provider    |

Coverage is merged across suites to `coverage/merged/` (LCOV for SonarCloud, HTML for local review). The AAC uses snapshot tests for regression detection.

## Versioned API

Two API versions coexist: `/application/validate` (v1) and `/api/v2/application/validate` (v2). Action configurations carry a `version` field. Add new versions by extending the rules engine directory rather than modifying existing rules.

## Notes

- JS files use JSDoc type annotations checked by TypeScript (`tsconfig.json` with `checkJs: true`) — no `.ts` files
- ES modules throughout; Babel transpiles for production (`babel.config.cjs`)
- `src/land-data/` contains seed SQL files for local dev population
- `docs/` has detailed write-ups for AAC, payment calculation, ETL ingestion, and Pact testing

## Development approach

- Start with a failing unit test that captures the expected behaviour (e.g., AAC calculation for a specific scenario)
- Implement the minimum code to pass the test, using TDD principles
- Refactor for clarity and maintainability, ensuring all tests still pass
