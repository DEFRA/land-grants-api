import mongoose from 'mongoose'
import { seedDatabase } from '~/src/api/common/helpers/seed-database.js'
import data from '~/src/api/common/helpers/seed-data/index.js'
import models from '~/src/api/common/models/index.js'

jest.mock('mongoose', () => ({
  connection: {
    readyState: 1
  },
  STATES: {
    connected: 1
  }
}))

jest.mock('~/src/api/common/models/index.js', () => {
  const mockDropCollection = jest.fn().mockResolvedValue(true)
  const mockInsertMany = jest.fn().mockResolvedValue(true)

  return {
    'action-data': {
      db: {
        dropCollection: mockDropCollection
      },
      insertMany: mockInsertMany
    }
  }
})

describe('seedDatabase', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully seeds the database when mongoose is connected', async () => {
    await seedDatabase(mockLogger)

    expect(models['action-data'].db.dropCollection).toHaveBeenCalledTimes(1)

    expect(models['action-data'].insertMany).toHaveBeenCalledWith(
      data['action-data']
    )

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Dropped collection')
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully inserted')
    )
  })

  test('handles database error', async () => {
    models['action-data'].insertMany.mockRejectedValueOnce(
      new Error('DB insert error')
    )

    await seedDatabase(mockLogger)

    expect(mockLogger.error).toHaveBeenCalled()

    expect(models['action-data'].insertMany).toHaveBeenCalled()
  })

  test('waits for mongoose connection if not connected', async () => {
    mongoose.connection.readyState = 0

    setTimeout(() => {
      mongoose.connection.readyState = 1
    }, 1500)

    await seedDatabase(mockLogger)

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Waiting for mongoose to connect...'
    )

    expect(models['action-data'].insertMany).toHaveBeenCalled()
  })
})
