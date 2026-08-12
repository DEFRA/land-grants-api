### Start the api via docker compose

```bash
# Run the API and Postgres in Docker without Localstack
npm run docker:up
```

```bash
# Stop the API and Postgres containers
npm run docker:down
```

```bash
# Run the API, Postgres and Localstack in Docker
npm run docker:localstack:up
```

```bash
# Stop the API, Postgres and Localstack containers
npm run docker:localstack:down
```

Note: Running via Docker compose supports hot reloading of the API code, so you can make changes to the code and see them reflected in the running API.

### Database migrations with Docker Compose

This project uses Liquibase to manage database schema changes. There are two ways to run migrations locally, depending on whether you want to run them inside the main `compose.yml` stack or against an existing database from a separate, `grants-ui` compose file.

#### Option A — Run the full stack from compose.yml

The main `compose.yml` includes two ephemeral services behind a Docker Compose profile named `migrations`:

- `database-up` — applies pending Liquibase changes (`update`).
- `database-down` — rolls the schema back to the base tag `v0.0.0`.

To run the stack (API + Postgres):

```bash
npm run docker:up
```

Once the database is healthy, you may run the migration containers within the same stack if required:

```bash
npm run docker:migrate:up
```

And optionally run the "down" migrations:

```bash
npm run docker:migrate:down
```

Bring the stack down when you’re done:

```bash
npm run docker:down
```

#### Option B — Use the lightweight compose.migrations.yml

`compose.migrations.yml` provides the same `database-up` and `database-down` services without starting the API or database services. Use this when you already have a Postgres instance running (for example, from the `grants-ui` stack) and just want to apply or roll back migrations.

Key points:

- The file expects a Postgres instance to be reachable at `POSTGRES_HOST` and on the Docker network `grants-ui-net` (external). You can override `POSTGRES_HOST` and other env vars when running.
- It mounts the local `changelog/` and `scripts/` folders into the Liquibase container so it runs your project’s migrations.

Convenient npm scripts have been added for this workflow:

```bash
# Apply migrations to the grants-ui database
npm run docker:migrate:ext:up
```

```bash
# Roll back all migrations to the base tag v0.0.0
npm run docker:migrate:ext:down
```
