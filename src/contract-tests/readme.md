# Pact provider tests

Pact provider tests pull expectation files from a broker hosted on the FCP Platform (Azure) and checks
them against the API. These files are sent from consumers of this API e.g. `grants-ui`.

The purpose of this is to make sure the API is able to serve data in a form the consumers recognise.

## Setup for local dev

- Copy pact env vars from .env.example to .env
- Add the pact broker password to the .env file
- Connect to azure vpn
