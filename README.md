# Land Grants API

To read more about the farming grants platform, see this docs repo:

https://github.com/DEFRA/farming-grants-docs

To read more about Land Grants API see
https://github.com/DEFRA/farming-grants-docs/docs/projects/land-grants-api

or the same on confluence:
https://eaflood.atlassian.net/wiki/spaces/LGS/pages/5866356750/Land+Grants+Service+Home

The capabilities of the `land-grants-api` include:

- [Available area calculation](docs/available-area-calculation.md)
- [Land based grant application eligibility checks](docs/eligibility-checks.md)
- [Grant payment calculations](docs/payment-calculation.md)

## Contents

- [Working wiith qgis](docs/working-wiith-qgis.md)

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

An `.env` is NOT required for running the API locally, all the config values are defaulted to a local setup, unless developer/user wants to override these for testing; if so see `env.example`.

### Setup

Install application dependencies:

```bash
npm install
```

### Download the land data

1. Download the `sql` files from [sharepoint]('https://defra.sharepoint.com/teams/Team1645/Restricted_FCP%20RPS%20Future/Forms/AllItems.aspx?id=%2Fteams%2FTeam1645%2FRestricted%5FFCP%20RPS%20Future%2Fland%2Dgrant%2Dapi%2Ddata&viewid=f5678bbd%2Dae3a%2D4cd4%2D9f4c%2Dab8e79452a94&ovuser=770a2450%2D0227%2D4c62%2D90c7%2D4e38537f1102%2CJilly%2EGledhill%40defra%2Egov%2Euk&OR=Teams%2DHL&CT=1733739622621&clickparams=eyJBcHBOYW1lIjoiVGVhbXMtRGVza3RvcCIsIkFwcFZlcnNpb24iOiI0OS8yNDEwMjAwMTMxOCIsIkhhc0ZlZGVyYXRlZFVzZXIiOmZhbHNlfQ%3D%3D'), talk to a collegue if you do not have access.

2. Copy these files to to the `src/api/common/migration` folder

The api uses [Liquibase](https://docs.liquibase.com/home.html) for db migrations, the `changelog` folder contains our current `postgres` schema

### Development

In order to run the api, you will need `docker` installed, so please make sure this is running when either running the setup or starting the api.

To run the application in `development` mode run the following commands:

#### Create database

You are only required to run this once, unless the schema changes.

This script:

- will start a dockerised postgres database
- extract the data seed files into the changelog folder
- run the liquibase migration, creating the tables

```bash
npm run dev:setup
```

#### Start the api

This script will start the api

```bash
npm run dev
```

#### Seed data

The seed data is in `src/api/common/migration` and are compressed sql files.

They are uncompressed when you run `npm run dev:setup` or the db tests, and are instered as part of the migrations.

When updating seed data we cannot update the existing files, we will need to create a new migration updating the seed data.

### Testing

In order to run the `db tests` please make sure you have `docker` running

In order to run all the tests

```bash
npm run test
```

We can also run these individually for `unit` and `db`

```bash
npm run test:unit
```

```bash
npm run test:db
```

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
