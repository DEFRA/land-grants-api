import { getStats } from '~/src/api/statistics/queries/stats.query.js'

import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Get stats', () => {
  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should log stats for all tables', async () => {
    await getStats(logger, connection)

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Get stats')
      })
    )

    const loggedContext = logger.info.mock.calls[0][0].context

    expect(loggedContext).toHaveProperty('actionsCount')
    expect(loggedContext).toHaveProperty('actionsConfigCount')
    expect(loggedContext).toHaveProperty('agreementsCount')
    expect(loggedContext).toHaveProperty('applicationResultsCount')
    expect(loggedContext).toHaveProperty('compatibilityMatrixCount')
    expect(loggedContext).toHaveProperty('landCoverCodesCount')
    expect(loggedContext).toHaveProperty('landCoverCodesActionsCount')
    expect(loggedContext).toHaveProperty('landCoversCount')
    expect(loggedContext).toHaveProperty('landParcelsCount')
    expect(loggedContext).toHaveProperty('moorlandDesignationsCount')
  })

  test('should return counts as strings', async () => {
    await getStats(logger, connection)

    const loggedContext = logger.info.mock.calls[0][0].context

    // PostgreSQL COUNT returns strings
    expect(typeof loggedContext.actionsCount).toBe('string')
    expect(typeof loggedContext.actionsConfigCount).toBe('string')
  })

  test('should have actions count greater than 0', async () => {
    await getStats(logger, connection)

    const loggedContext = logger.info.mock.calls[0][0].context

    expect(Number(loggedContext.actionsCount)).toBeGreaterThan(0)
  })

  test('should not call error logger on success', async () => {
    await getStats(logger, connection)

    expect(logger.error).not.toHaveBeenCalled()
  })
})
