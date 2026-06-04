# Land Grants API

To read more about the farming grants platform, see this docs repo:

- [Farming grants docs github](https://github.com/DEFRA/farming-grants-docs)
- [Farming grants docs interactive architecture diagrams](https://bookish-adventure-1e9zvrl.pages.github.io/)

To read more about Land Grants API see

- [Land grants api docs github](https://github.com/DEFRA/farming-grants-docs/blob/main/docs/projects/land-grants-api/1-introduction-and-goals.md) or
- [Land grants api docs confluence](https://eaflood.atlassian.net/wiki/spaces/LGS/pages/5866356750/Land+Grants+Service+Home)

The capabilities of the `land-grants-api` include:

- [Available area calculation](docs/aac-specification.md)
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

Authentication

- [Authentication Endpoints](docs/authentication.md)

Starting the api via Docker

- [Starting the API with Docker](docs/working-with-docker.md)

## Versioning

Details of changes to upcoming `V2` release can be found here:

- [Changelog](docs/changelog.md)

We have 3 levels of versioning.

1. Versioned endpoints, e.g. `api/v2/*` this is achieved by versioned subfolders
2. Versioned action configuration, action configs have a version number
3. Versioned rules, part of action configuration, rules have a version number

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

### Setup

Install application dependencies:

```bash
npm install
```

### Development

If you would like to run the API via docker, see here: [Starting the API with Docker](docs/working-with-docker.md)

In order to run this api locally in order to carry out development on the api, please follow:

#### Create and seed a local database

Please ask a colleague for access to land data.

The following command:

- will start a dockerised postgres database
- run the liquibase migration, creating the tables

```bash
npm run dev:setup
```

#### Ingest data into your local database

In order to ingest data into your database, edit the file `scripts/local-ingest`, and set the path to you data directory, currently set to `./ingestion-data/data/`.

We support the ingestion of the following resources:

- ingestion-data
  - data
    - parcels
    - covers
    - moorland
    - agreements
    - compatibility_matrix
    - sssi
    - registered_battlefields
    - shine
    - scheduled_monuments
    - registered_parks_gardens

Run the local ingest script for each resource type:

`node scripts/local-ingest`

#### Increase docker storage

If you have issues running this, and ot throws errors like : `No space left on device`

- Delete your docker volumes via desktop
- Clean your docker instance
  `docker system prune -a`

- Edit your compose.yml file, and increase the `shm_size`

```
land-grants-backend-postgres:
    image: postgis/postgis:16-3.4
    shm_size: 2gb
```

#### Localstack

If you would like to run the ingestion process end to end using AWS S3, you can use localstack:

```
npm run docker:localstack:up
```

#### Testing the grants-config-broker SQS integration

End-to-end local test flow: `grants-config-broker` → SNS → SQS → `land-grants-api`

##### Prerequisites

- AWS CLI installed
- `../grants-config-broker` and `../land-grants-config` checked out as siblings of this repo

##### 1. Start the land-grants-api stack

```bash
npm run dev:setup
npm run dev
```

##### 2. Run the config-broker helper script

`scripts/start-config-broker.sh` manages the broker's config directory and starts the service. Run with `--help` to see all options:

```bash
./scripts/start-config-broker.sh --help
```

###### Subcommands

| Subcommand                   | Description                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| _(no args)_                  | Start the broker with no config changes (useful for a restart)                       |
| `add <version> <sem-ver>`    | Create a synthetic **TEST01** action config and start the broker                     |
| `update <version> <sem-ver>` | Copy PA3 from `land-grants-config`, set a new semantic version, and start the broker |
| `inspect`                    | Print SQS queues, S3 bucket contents, and `actions_config` DB rows — then exit       |

> **Idempotency:** the broker skips versions already recorded in MongoDB. Bump `<version>` or `<sem-ver>` to exercise the insert path again.

###### Examples

```bash
# Publish a brand-new action code (TEST01) and start the broker
./scripts/start-config-broker.sh add 0.0.5 1.0.0

# Republish PA3 with a new semantic version and start the broker
./scripts/start-config-broker.sh update 0.0.6 2.0.0

# Restart the broker without touching config (previous run's files still in place)
./scripts/start-config-broker.sh

# Check what landed in LocalStack and the DB
./scripts/start-config-broker.sh inspect
```

##### Useful AWS CLI commands

> The script exports LocalStack credentials automatically. If you run these commands in a separate terminal, set them first:
>
> ```bash
> export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
>        AWS_REGION=eu-west-2 AWS_ENDPOINT_URL=http://localhost:4566
> ```

**List SQS queues:**

```bash
aws sqs list-queues
```

**Peek at messages in the queue without consuming them:**

```bash
aws sqs receive-message \
  --queue-url http://localhost:4566/000000000000/grants_config_broker_update \
  --attribute-names All \
  --message-attribute-names All
```

**List all files in configs-bucket:**

```bash
aws s3 ls s3://configs-bucket --recursive
```

**Inspect a config file directly from S3:**

```bash
aws s3 cp s3://configs-bucket/land-grants/0.0.5/actions/PA3/pa3-2.0.0.json -
```

**Manually publish an SNS message** (useful when re-testing without restarting the broker — the broker will not re-deploy a version it has already recorded in MongoDB):

```bash
aws sns publish \
  --topic-arn arn:aws:sns:eu-west-2:000000000000:gfr__sns___config_update \
  --message '["land-grants/0.0.5/actions/PA3/pa3-2.0.0.json","land-grants/0.0.5/metadata.json"]' \
  --message-attributes '{
    "grant":   {"DataType":"String","StringValue":"land-grants"},
    "version": {"DataType":"String","StringValue":"0.0.5"},
    "status":  {"DataType":"String","StringValue":"active"},
    "path":    {"DataType":"String","StringValue":"s3://configs-bucket"}
  }'
```

**Verify DB rows were inserted or updated:**

```bash
docker exec -it land-grants-api-land-grants-backend-postgres-1 psql \
  -U land_grants_api -d land_grants_api \
  -c "SELECT code, semantic_version, version, is_active FROM actions_config WHERE code IN ('PA3','TEST01') ORDER BY code, id;"
```

#### Local data

There is a script to ingest data files for local development: (./scripts/ingest-land-data-local.js)

You will need to run the service locally, including database and localstack.

```shell
node ./scripts/ingest-land-data-local.js <resource type> <file path/directory>
```

To ingest a parcels file:

```shell
node ./scripts/ingest-land-data-local.js parcels parcels_1.csv
```

```shell
node ./scripts/ingest-land-data-local.js parcels ../data-files/parcels/
```

#### Start the api

To run the application in `development` mode run the following command:

```bash
npm run dev
```

#### Start the api via docker compose

If you do not plan to carry out development on this API you might prefer to start the api via docker compose, please visit here for details:

- [Starting the API with Docker](docs/working-with-docker.md)

### Testing

In order to run the test(s)

```bash
npm run test

npm run test:unit
npm run test:db
npm run test:ingest
npm run test:e2e
```

## Database Migrations

The api uses [Liquibase](https://docs.liquibase.com/home.html) for db migrations, the `changelog` folder contains our current `postgres` schema.

When making changes to the existing schema, we cannot update the existing seed data files, or alter existing files in the `changelog`, you will need to create a new migration, which are named `db.changelog-(n+1).xml`.

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
