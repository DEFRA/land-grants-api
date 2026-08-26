import { getActionBySemanticVersion } from '~/src/features/actions/queries/2.0.0/getActionBySemanticVersion.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get Action By Semantic Version Query', () => {
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

  test('should return the WMP action config at an exact semantic version', async () => {
    const result = await getActionBySemanticVersion(
      logger,
      connection,
      'PA3',
      '1.1.0'
    )

    expect(result).not.toBeNull()
    expect(result.code).toBe('PA3')
    expect(result.semanticVersion).toBe('1.1.0')
    expect(result.enabled).not.toBe(false)
  })

  test('should return the payment method used by the payments engine', async () => {
    const result = await getActionBySemanticVersion(
      logger,
      connection,
      'PA3',
      '1.1.0'
    )

    expect(result.paymentMethod).toBeDefined()
    expect(result.paymentMethod.name).toBe('wmp-calculation')
    expect(result.paymentMethod.config.tiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lowerLimitHa: expect.any(Number),
          flatRateGbp: expect.any(Number),
          ratePerUnitGbp: expect.any(Number)
        })
      ])
    )
  })

  test('should return null for a version that does not exist', async () => {
    const result = await getActionBySemanticVersion(
      logger,
      connection,
      'PA3',
      '9.9.9'
    )

    expect(result).toBeNull()
  })

  test('should return null for an unknown action code', async () => {
    const result = await getActionBySemanticVersion(
      logger,
      connection,
      'UNKNOWN',
      '1.0.0'
    )

    expect(result).toBeNull()
  })
})
