# Pact provider tests

Pact provider tests pull expectation files from a broker hosted on the FCP Platform (Azure) and checks
them against the API. These files are sent from consumers of this API e.g. `grants-ui`.

The purpose of this is to make sure the API is able to serve data in a form the consumers recognise.

## Setup for local dev

- Copy pact env vars from .env.example to .env
- Add the pact broker password to the .env file
- Connect to azure vpn

## Running Pact tests

### Using the Pact Broker (default)

The tests will automatically fetch the latest Pact contracts from the broker:

```bash
npm test -- pact.test.js
```

This requires:

- Azure VPN connection
- Valid Pact Broker credentials in your `.env` file

### Using local Pact files

To run tests against a local Pact contract file instead of the broker:

1. **Generate the Pact file** from the consumer project (e.g., `grants-ui`):

```bash
   cd ../grants-ui
   npm test:contracts
```

This will generate Pact files in the consumer's `pacts/` directory.

2. **Modify the test file** to reference the consumer's Pact file directly:

   In your Pact test file, replace the broker configuration:

```javascript
const pactVerifierOptions = {
  provider: 'land-grants-api',
  providerBaseUrl: 'http://localhost:3001',

  // Comment out or remove broker config:
  // pactBrokerUrl: env.PACT_BROKER_URL ?? '...',
  // consumerVersionSelectors: [{ latest: true }],
  // pactBrokerUsername: env.PACT_BROKER_USERNAME,
  // pactBrokerPassword: env.PACT_BROKER_PASSWORD,

  // Reference the consumer's generated pact file directly:
  pactUrls: [
    '/path/to/your/grants-ui-project/pacts/grants-ui-land-grants-api.json'
  ],

  // Optional: disable publishing when testing locally
  publishVerificationResult: false

  // ... rest of config
}
```

3. **Run the tests**:

```bash
   npm run test:contracts
```

**Benefits of using local files:**

- No VPN connection required
- Faster test execution
- Test against the latest consumer expectations immediately
- Offline development support
- No need to duplicate files

**Note:** Remember to revert changes to the test file before committing, or consider using an environment variable to toggle between broker and local file modes.
