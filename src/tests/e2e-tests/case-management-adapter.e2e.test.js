import { describe, test, expect, beforeAll } from 'vitest'
import { httpClient } from './setup/http-client.js'
import { getAuthHeader } from './setup/auth-helpers.js'

describe('Case Management Adapter Endpoints', () => {
  let validationRunId

  beforeAll(async () => {
    const response = await httpClient.post('/api/v2/application/validate', {
      headers: { Authorization: getAuthHeader() },
      body: {
        applicationId: 'appid-cma-1',
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

  describe('GET /case-management-adapter/application/validation-run/{id}', () => {
    test('should retrieve validation run by id with authentication', async () => {
      const response = await httpClient.get(
        `/case-management-adapter/application/validation-run/${validationRunId}`,
        {
          headers: { Authorization: getAuthHeader() }
        }
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('response')
      expect(response.data.response).toBeInstanceOf(Array)
      expect(response.data.message).toBe(
        'Application validation run retrieved successfully'
      )
    })
  })

  describe('POST /case-management-adapter/application/validation-run/rerun', () => {
    test('should rerun validation with authentication', async () => {
      const response = await httpClient.post(
        '/case-management-adapter/application/validation-run/rerun',
        {
          headers: { Authorization: getAuthHeader() },
          body: {
            requesterUsername: 'test-user',
            id: validationRunId
          }
        }
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('valid')
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('date')
      expect(typeof response.data.valid).toBe('boolean')
      expect(response.data.message).toBe('Application validated successfully')
    })

    test('should return 404 for non-existent validation run id', async () => {
      const response = await httpClient.post(
        '/case-management-adapter/application/validation-run/rerun',
        {
          headers: { Authorization: getAuthHeader() },
          body: {
            requesterUsername: 'test-user',
            id: 999999999
          }
        }
      )

      expect(response.status).toBe(404)
    })
  })
})
