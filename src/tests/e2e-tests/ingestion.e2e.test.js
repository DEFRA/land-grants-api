import { describe, test, expect } from 'vitest'
import { httpClient } from './setup/http-client.js'
import { getAuthHeader } from './setup/auth-helpers.js'

describe('Ingestion Endpoints', () => {
  describe('POST /initiate-upload', () => {
    test('should return 200 with upload URL for valid payload', async () => {
      const response = await httpClient.post('/initiate-upload', {
        headers: { Authorization: getAuthHeader() },
        body: {
          reference: 'REF-e2e-1',
          customerId: 'CUST-e2e-1',
          resource: 'land_parcels'
        }
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('uploadUrl')
      expect(response.data.message).toBe('Land data upload initiated')
    })

    test('should return 400 for missing required fields', async () => {
      const response = await httpClient.post('/initiate-upload', {
        headers: { Authorization: getAuthHeader() },
        body: {
          reference: 'REF-e2e-2'
        }
      })

      expect(response.status).toBe(400)
    })

    test('should return 400 for invalid resource', async () => {
      const response = await httpClient.post('/initiate-upload', {
        headers: { Authorization: getAuthHeader() },
        body: {
          reference: 'REF-e2e-3',
          customerId: 'CUST-e2e-3',
          resource: 'invalid_resource'
        }
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /cdp-uploader-callback', () => {
    const validPayload = {
      uploadStatus: 'ready',
      numberOfRejectedFiles: 0,
      metadata: {},
      form: {
        file: {
          fileId: 'file-e2e-1',
          filename: 'land-data.csv',
          contentType: 'text/csv',
          fileStatus: 'complete',
          contentLength: 1024,
          s3Key: 'parcels/land-data-e2e.csv',
          s3Bucket: 'land-data',
          hasError: false
        }
      }
    }

    test('should return 200 with success message for valid payload', async () => {
      const response = await httpClient.post('/cdp-uploader-callback', {
        body: validPayload
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data.message).toBe('Message received')
    })

    test('should return 400 when file has error', async () => {
      const response = await httpClient.post('/cdp-uploader-callback', {
        body: {
          ...validPayload,
          form: {
            file: {
              ...validPayload.form.file,
              hasError: true,
              errorMessage: 'File validation failed'
            }
          }
        }
      })

      expect(response.status).toBe(400)
      expect(response.data.message).toBe('File validation failed')
    })

    test('should return 400 when file is not ready', async () => {
      const response = await httpClient.post('/cdp-uploader-callback', {
        body: {
          ...validPayload,
          form: {
            file: {
              ...validPayload.form.file,
              fileStatus: 'pending'
            }
          }
        }
      })

      expect(response.status).toBe(400)
      expect(response.data.message).toBe('File is not ready')
    })

    test('should return 400 for invalid uploadStatus', async () => {
      const response = await httpClient.post('/cdp-uploader-callback', {
        body: {
          ...validPayload,
          uploadStatus: 'invalid-status'
        }
      })

      expect(response.status).toBe(400)
      expect(response.data).toHaveProperty('message')
    })
  })

  describe('POST /ingest/{entity}/start', () => {
    test('should return new ingestId for valid payload', async () => {
      const response = await httpClient.post('/ingest/land_parcels/start', {
        headers: { Authorization: getAuthHeader() },
        body: {
          files: [
            {
              filename: 'land-data.csv',
              rows: 10
            }
          ]
        }
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('ingestId')
    })

    test('should return status for ingestId', async () => {
      const response = await httpClient.post('/ingest/land_parcels/start', {
        headers: { Authorization: getAuthHeader() },
        body: {
          files: [
            {
              filename: 'land-data.csv',
              rows: 10
            }
          ]
        }
      })

      const { ingestId } = response.data

      const statusResponse = await httpClient.get(
        `/ingest/status?ingestId=${ingestId}`,
        {
          headers: { Authorization: getAuthHeader() }
        }
      )

      expect(statusResponse.status).toBe(200)
      expect(statusResponse.data).toHaveProperty('status')
    })

    test('should return status for ingestId and filename', async () => {
      const response = await httpClient.post('/ingest/land_parcels/start', {
        headers: { Authorization: getAuthHeader() },
        body: {
          files: [
            {
              filename: 'land-data.csv',
              rows: 10
            }
          ]
        }
      })

      const { ingestId } = response.data

      const statusResponse = await httpClient.get(
        `/ingest/status?ingestId=${ingestId}&filename=land-data.csv`,
        {
          headers: { Authorization: getAuthHeader() }
        }
      )

      expect(statusResponse.status).toBe(200)
      expect(statusResponse.data).toHaveProperty('filename')
      expect(statusResponse.data.filename).toBe('land-data.csv')
    })

    test('should return 400 when filename is provided without ingestId', async () => {
      const statusResponse = await httpClient.get(
        '/ingest/status?filename=land-data.csv',
        {
          headers: { Authorization: getAuthHeader() }
        }
      )

      expect(statusResponse.status).toBe(400)
    })
  })
})
