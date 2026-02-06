import { describe, test, expect } from 'vitest'
import { httpClient } from './setup/http-client.js'
import { getAuthHeader } from './setup/auth-helpers.js'

describe('Application Validation Endpoints', () => {
  describe('POST /api/v2/application/validate', () => {
    test('should validate application with authentication', async () => {
      const response = await httpClient.post('/api/v2/application/validate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          applicationId: 'appid-1',
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('valid')
      expect(response.data).toHaveProperty('actions')
      expect(typeof response.data.valid).toBe('boolean')
      expect(typeof response.data.id).toBe('number')
    })

    test('should return 401 without authentication', async () => {
      const response = await httpClient.post('/api/v2/application/validate', {
        body: {
          applicationId: 'appid-2',
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(401)
    })

    test('should return 400 for missing required fields', async () => {
      const response = await httpClient.post('/api/v2/application/validate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          applicationId: 'appid-3',
          requester: 'test-user'
        }
      })

      expect(response.status).toBe(400)
    })

    test('should return 422 for negative quantity', async () => {
      const response = await httpClient.post('/api/v2/application/validate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          applicationId: 'appid-5',
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: -10
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(422)
    })

    test('should validate multiple parcels with multiple actions', async () => {
      const response = await httpClient.post('/api/v2/application/validate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          applicationId: 'appid-6',
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                },
                {
                  code: 'UPL1',
                  quantity: 5
                }
              ]
            },
            {
              sheetId: 'SD7247',
              parcelId: '8028',
              actions: [
                {
                  code: 'UPL2',
                  quantity: 3
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(200)
      expect(response.data.actions).toBeInstanceOf(Array)
      expect(response.data.actions.length).toBeGreaterThan(0)
    })
  })

  describe('POST /application/validate', () => {
    test('should validate application with authentication', async () => {
      const response = await httpClient.post('/application/validate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          applicationId: 'appid-v1-1',
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('id')
    })

    test('should return 401 without authentication', async () => {
      const response = await httpClient.post('/application/validate', {
        body: {
          applicationId: 'appid-v1-2',
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /application/validation-run/{id}', () => {
    let validationRunId

    test('should create validation run for retrieval test', async () => {
      const response = await httpClient.post('/api/v2/application/validate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          applicationId: 'appid-run-1',
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(200)
      validationRunId = response.data.id
    })

    test('should retrieve validation run by id with authentication', async () => {
      const response = await httpClient.post(
        `/application/validation-run/${validationRunId}`,
        {
          headers: { Authorization: getAuthHeader() }
        }
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('applicationValidationRun')
      expect(response.data.applicationValidationRun).toMatchObject({
        id: validationRunId,
        application_id: 'appid-run-1',
        sbi: expect.any(String),
        crn: expect.any(String),
        data: expect.any(Object),
        created_at: expect.any(String)
      })
    })

    test('should return 401 without authentication', async () => {
      const response = await httpClient.post(
        `/application/validation-run/${validationRunId}`
      )

      expect(response.status).toBe(401)
    })

    test('should return 404 for non-existent validation run id', async () => {
      const response = await httpClient.post(
        '/application/validation-run/999999999',
        {
          headers: { Authorization: getAuthHeader() }
        }
      )

      expect(response.status).toBe(404)
    })
  })

  describe('POST /application/{applicationId}/validation-run', () => {
    const testApplicationId = 'appid-11'

    test('should create validation run', async () => {
      const response = await httpClient.post('/api/v2/application/validate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          applicationId: testApplicationId,
          requester: 'test-user',
          applicantCrn: '1234567890',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(200)
    })

    test('should retrieve validation runs for application with authentication', async () => {
      const response = await httpClient.post(
        `/application/${testApplicationId}/validation-run`,
        {
          headers: { Authorization: getAuthHeader() },
          body: {
            fields: []
          }
        }
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('applicationValidationRuns')
      expect(response.data.applicationValidationRuns).toBeInstanceOf(Array)
      expect(response.data.applicationValidationRuns.length).toBeGreaterThan(0)
    })

    test('should return 401 without authentication', async () => {
      const response = await httpClient.post(
        `/application/${testApplicationId}/validation-run`,
        {
          body: {
            fields: []
          }
        }
      )

      expect(response.status).toBe(401)
    })
  })
})
