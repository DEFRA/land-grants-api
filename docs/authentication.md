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
