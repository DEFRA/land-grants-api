import { vi } from 'vitest'
import { getActions } from './action.service.js'
import { getLatestApplicationRunForAppId } from '~/src/features/application/queries/getLatestApplicationRunForAppId.query.js'
import { getActionsByVersion } from '~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'

vi.mock(
  '~/src/features/application/queries/getLatestApplicationRunForAppId.query.js'
)
vi.mock('~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js')
vi.mock('~/src/features/common/helpers/logging/log-helpers.js')

const mockGetLatestApplicationRunForAppId = vi.mocked(
  getLatestApplicationRunForAppId
)
const mockGetActionsByVersion = vi.mocked(getActionsByVersion)

describe('Action Service', () => {
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }

  const mockRequest = {
    logger: mockLogger
  }

  const mockPostgresDb = {
    connect: vi.fn(),
    query: vi.fn()
  }

  const mockLandActions = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [{ code: 'CMOR1' }, { code: 'CMOR2' }]
    },
    {
      sheetId: 'SX0680',
      parcelId: '1234',
      actions: [{ code: 'CMOR3' }]
    }
  ]

  const mockApplicationId = 'APP-123456'

  const mockActionConfigs = [
    { code: 'CMOR1', semanticVersion: '1.0.0' },
    { code: 'CMOR2', semanticVersion: '2.0.0' },
    { code: 'CMOR3', semanticVersion: '1.0.0' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActionsByVersion.mockResolvedValue(mockActionConfigs)
  })

  describe('getActions', () => {
    test('should return action configs using latest versions when no previous run exists', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue(null)

      const result = await getActions(
        mockRequest,
        mockPostgresDb,
        mockLandActions,
        mockApplicationId
      )

      expect(result).toEqual(mockActionConfigs)
      expect(mockGetLatestApplicationRunForAppId).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb,
        mockApplicationId
      )
      expect(mockGetActionsByVersion).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb,
        [{ code: 'CMOR1' }, { code: 'CMOR2' }, { code: 'CMOR3' }]
      )
    })

    test('should pin versions from the previous validation run', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue({
        data: {
          parcelLevelResults: [
            {
              actions: [
                { code: 'CMOR1', actionConfigVersion: '1.0.0' },
                { code: 'CMOR2', actionConfigVersion: '1.5.0' }
              ]
            }
          ]
        }
      })

      await getActions(
        mockRequest,
        mockPostgresDb,
        mockLandActions,
        mockApplicationId
      )

      expect(mockGetActionsByVersion).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb,
        expect.arrayContaining([
          { code: 'CMOR1', version: '1.0.0' },
          { code: 'CMOR2', version: '1.5.0' },
          { code: 'CMOR3' }
        ])
      )
    })

    test('should prefer versioned entries from previous run when codes overlap', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue({
        data: {
          parcelLevelResults: [
            {
              actions: [{ code: 'CMOR1', actionConfigVersion: '2.0.0' }]
            }
          ]
        }
      })

      await getActions(
        mockRequest,
        mockPostgresDb,
        mockLandActions,
        mockApplicationId
      )

      const calledWith = mockGetActionsByVersion.mock.calls[0][2]
      const cmor1Entry = calledWith.find((a) => a.code === 'CMOR1')
      expect(cmor1Entry).toEqual({ code: 'CMOR1', version: '2.0.0' })
    })

    test('should deduplicate actions so each code appears exactly once', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue({
        data: {
          parcelLevelResults: [
            {
              actions: [{ code: 'CMOR1', actionConfigVersion: '1.0.0' }]
            }
          ]
        }
      })

      await getActions(
        mockRequest,
        mockPostgresDb,
        mockLandActions,
        mockApplicationId
      )

      const calledWith = mockGetActionsByVersion.mock.calls[0][2]
      const cmor1Entries = calledWith.filter((a) => a.code === 'CMOR1')
      expect(cmor1Entries).toHaveLength(1)
    })

    test('should handle null landActions gracefully', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue(null)

      await getActions(mockRequest, mockPostgresDb, null, mockApplicationId)

      expect(mockGetActionsByVersion).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb,
        []
      )
    })

    test('should handle null applicationValidationRun (database error) gracefully', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue(null)

      await getActions(
        mockRequest,
        mockPostgresDb,
        mockLandActions,
        mockApplicationId
      )

      expect(mockGetActionsByVersion).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb,
        [{ code: 'CMOR1' }, { code: 'CMOR2' }, { code: 'CMOR3' }]
      )
    })

    test('should log flattened land actions, previous run actions, and merged actions', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue(null)

      await getActions(
        mockRequest,
        mockPostgresDb,
        mockLandActions,
        mockApplicationId
      )

      expect(logInfo).toHaveBeenCalledWith(
        mockLogger,
        expect.objectContaining({ message: 'Flattened land actions' })
      )
      expect(logInfo).toHaveBeenCalledWith(
        mockLogger,
        expect.objectContaining({ message: 'Previous run actions' })
      )
      expect(logInfo).toHaveBeenCalledWith(
        mockLogger,
        expect.objectContaining({ message: 'Merged actions' })
      )
    })

    test('should return empty array when getActionsByVersion returns empty', async () => {
      mockGetLatestApplicationRunForAppId.mockResolvedValue(null)
      mockGetActionsByVersion.mockResolvedValue([])

      const result = await getActions(
        mockRequest,
        mockPostgresDb,
        mockLandActions,
        mockApplicationId
      )

      expect(result).toEqual([])
    })
  })
})
