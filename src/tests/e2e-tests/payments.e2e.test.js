import { describe, test, expect } from 'vitest'
import { httpClient } from './setup/http-client.js'
import { getAuthHeader } from './setup/auth-helpers.js'

describe('Payments Endpoints', () => {
  describe('POST /api/v2/payments/calculate', () => {
    test('should calculate payment for valid request with authentication', async () => {
      const response = await httpClient.post('/api/v2/payments/calculate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          startDate: '2024-01-01',
          parcel: [
            {
              sheetId: 'SD5649',
              parcelId: '9215',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10.5
                }
              ]
            }
          ]
        }
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('message')
      expect(response.data).toHaveProperty('payment')
      expect(response.data.payment).toMatchObject({
        agreementStartDate: expect.any(String),
        agreementEndDate: expect.any(String),
        frequency: expect.stringMatching(/Monthly|Quarterly|Annually/),
        agreementTotalPence: expect.any(Number),
        annualTotalPence: expect.any(Number),
        payments: expect.any(Array)
      })
    })
  })

  describe('POST /payments/calculate', () => {
    test('should calculate payment with authentication', async () => {
      const response = await httpClient.post('/payments/calculate', {
        headers: { Authorization: getAuthHeader() },
        body: {
          parcel: [
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
      expect(response.data).toHaveProperty('payment')
    })
  })
})
