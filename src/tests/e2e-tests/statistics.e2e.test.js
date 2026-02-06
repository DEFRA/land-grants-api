import { describe, test, expect } from 'vitest'
import { httpClient } from './setup/http-client.js'

describe('Statistics Endpoints', () => {
  test('GET /statistics - should return 200 with success message', async () => {
    const response = await httpClient.get('/statistics')

    expect(response.status).toBe(200)
    expect(response.data).toEqual({
      message: 'Statistics retrieved'
    })
  })
})
