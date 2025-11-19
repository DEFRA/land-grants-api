# Land Grants API

To read more about the farming grants platform, see this docs repo:

- [Farming grants docs github](https://github.com/DEFRA/farming-grants-docs)
- [Farming grants docs interactive architecture diagrams](https://bookish-adventure-1e9zvrl.pages.github.io/)

To read more about Land Grants API see

- [Land grants api docs github](https://github.com/DEFRA/farming-grants-docs/blob/main/docs/projects/land-grants-api/1-introduction-and-goals.md) or
- [Land grants api docs confluence](https://eaflood.atlassian.net/wiki/spaces/LGS/pages/5866356750/Land+Grants+Service+Home)

The capabilities of the `land-grants-api` include:

- [Available area calculation](docs/available-area-calculation.md)
- [Grant payment calculations](docs/payment-calculation.md)
- [Case management integration](docs/case-management.md)

The data ingestion process:

- [Day 1 land data ingestion](docs/day1-land-data-ingestion.md)
- [ETL Land data ingestion](docs/etl-land-data-ingestion.md)

Visualising parcel data with qgis

- [Working with qgis](docs/working-wiith-qgis.md)

Managing the service:

- [Managing the service on dev environment](docs/managing-the-service.md)

Pact testing

- [Contract testing with Pact](docs/pact-testing.md)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v18` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd land-grants-api
nvm use
```

## Local development

### Configuration

Copy the `env.example` file to `.env`, ask a colleague for the missing information.

#### Authentication

Two environment variables are required for authentication:

- `LAND_GRANTS_AUTH_TOKEN` - The token clients will encrypt and send
- `LAND_GRANTS_ENCRYPTION_KEY` - The key used for AES-256-GCM encryption (minimum 24 characters recommended)

Your `.env` file will have these, request values from a colleague.

```bash
LAND_GRANTS_AUTH_TOKEN=ASK-A-COLLEAGUE
LAND_GRANTS_ENCRYPTION_KEY=ASK-A-COLLEAGUE
```

#### Client Authentication

Clients must:

1. Encrypt the `LAND_GRANTS_AUTH_TOKEN` using AES-256-GCM with the shared `LAND_GRANTS_ENCRYPTION_KEY`
2. Format the encrypted token as: `iv:authTag:encryptedData` (all base64 encoded)
3. Base64 encode the entire formatted string
4. Send as a Bearer token: `Authorization: Bearer {base64EncodedEncryptedToken}`

#### Excluded Endpoints

The following endpoints do not require authentication:

- `GET /health` - Health check endpoint

To exclude additional endpoints from authentication, set `auth: false` in the route options:

```javascript
server.route({
  method: 'GET',
  path: '/your-endpoint',
  options: {
    auth: false
  },
  handler: (request, h) => {
    // handler code
  }
})
```

### Setup

Install application dependencies:

```bash
npm install
```

### Development

#### Create and seed a local database

This script:

- will start a dockerised postgres database
- extract the data seed files into the changelog folder
- run the liquibase migration, creating the tables

```bash
npm run dev:setup
```

#### Start the api

To run the application in `development` mode run the following command:

```bash
npm run dev
```

Or via Docker compose:

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

### Testing

In order to run the test(s)

```bash
npm run test

npm run test:unit

npm run test:db
```

## Database Migrations

The api uses [Liquibase](https://docs.liquibase.com/home.html) for db migrations, the `changelog` folder contains our current `postgres` schema.

When making changes to the existing schema, or updating seed data; we cannot update the existing seed data files, or alter existing files in the `changelog`, you will need to create a new migration, which are named `db.changelog-(n+1).xml`.

## API endpoints

This API includes swagger documentation, this can be viewed at:

`http://{host_name}:3001/documentation`

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
