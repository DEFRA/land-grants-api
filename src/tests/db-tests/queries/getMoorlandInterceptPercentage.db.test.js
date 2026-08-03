import { vi } from 'vitest'
import { getMoorlandInterceptPercentage } from '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get Moorland Intercept Percentage Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test.each([
    ['tiny amount of moorland and ref_code = M', 'SD7324', '7862', 1],
    ['large enough amount of moorland and ref_code = M', 'SD6164', '6108', 96],
    ['full amount of moorland and ref_code = M', 'SD5649', '9215', 100],
    ['duplicate large amount and ref_code = M', 'SD6164', '6108', 96],
    ['no moorland and ref_code = M', 'SD5358', '8678', 0],
    ['sheet_id found but parcel_id not found', 'SD6842', '1234', 0],
    ['sheet id and parcel id not found', 'SD0000', '1234', 0]
  ])('when %s', async (_desc, sheetId, parcelId, expected) => {
    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(expected)
  })
})
