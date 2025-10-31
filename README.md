# Land Grants API

To read more about the farming grants platform, see this docs repo:

- [Farming grants docs github](https://github.com/DEFRA/farming-grants-docs)

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

- [Working and managing the service](docs/managing-the-service.md)

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

An `.env` is NOT required for running the API locally, all the config values are defaulted to a local setup, unless you want to override these for testing; if so see `env.example`.

The `.env` file is used for running the data ingestion process, which is not required to run the api. See `The data ingestion process` above for more details.

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

To run the application in `development` mode run the following commands, this script will start the api:

```bash
npm run dev
```

### Testing

In order to run the `db tests` please make sure you have `docker` running

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
