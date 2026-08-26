import { describe, test, expect } from 'vitest'
import { httpClient } from './setup/http-client.js'
import { getAuthHeader } from './setup/auth-helpers.js'

const headers = {
  Authorization: getAuthHeader(),
  'X-Forwarded-Authorization': 'dummy'
}

describe('Parcels Endpoints', () => {
  describe('POST /api/v2/parcels', () => {
    test('should return parcel data with size and actions when authenticated', async () => {
      try {
        const response = await httpClient.post('/api/v2/parcels', {
          headers,
          body: {
            sbi: '0123456789',
            parcelIds: ['SD5649-9215'],
            fields: ['size', 'actions']
          }
        })

        console.log('Status:', response.status)
        console.log('Response:', JSON.stringify(response.data, null, 2))

        expect(response.status).toBe(200)
        expect(response.data.message).toBe('success')
        expect(response.data.parcels).toHaveLength(1)
        expect(response.data.parcels[0]).toMatchObject({
          parcelId: '9215',
          sheetId: 'SD5649',
          size: {
            unit: 'ha',
            value: expect.any(Number)
          },
          actions: expect.arrayContaining([
            expect.objectContaining({
              code: expect.any(String),
              description: expect.any(String),
              availability: expect.objectContaining({
                unit: 'ha',
                value: expect.any(Number)
              })
            })
          ])
        })
      } catch (err) {
        console.log('error', JSON.stringify(err))
        throw err
      }
    })
  })
})
