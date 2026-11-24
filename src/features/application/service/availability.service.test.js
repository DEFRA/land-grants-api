import {
  getAvailability,
  existingActionsFit,
  existingActionsDoNotFitResult
} from './availability.service.js'
import { getAvailableLength } from '~/src/features/available-length/availableLength.js'
import { doNotFitSection } from '~/src/features/available-length/explanations.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON
} from '~/src/features/parcel/constants/unavailable-reasons.js'

vi.mock('~/src/features/available-length/availableLength.js')

describe('Availability Service', () => {
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }

  const mockPostgresDb = {
    connect: vi.fn(),
    query: vi.fn()
  }

  const mockRequest = {
    logger: mockLogger,
    server: {
      postgresDb: mockPostgresDb
    }
  }

  const linearAction = { code: 'BND1', quantity: 100 }
  const areaAction = { code: 'CMOR1', quantity: 10.5 }

  const landAction = {
    sheetId: 'SX0679',
    parcelId: '9238',
    actions: [linearAction]
  }

  const actions = [
    { code: 'BND1', applicationUnitOfMeasurement: 'm', rules: [] },
    { code: 'CMOR1', applicationUnitOfMeasurement: 'ha', rules: [] }
  ]

  const agreements = [{ code: 'LIG2', area: 100 }]

  const compatibilityCheckFn = vi.fn()

  const availableLengthOf = ({
    availableLength,
    feasible,
    incompatibleLengthMeters = 500 - availableLength
  }) => ({
    availableLength,
    boundaryLengthMeters: 500,
    incompatibleLengthMeters,
    incompatibleActions: [],
    feasible,
    explainedOccupancies: []
  })

  const existingActionsDoNotFitLength = availableLengthOf({
    availableLength: 0,
    feasible: false,
    incompatibleLengthMeters: 600
  })

  const existingActionsFitLength = availableLengthOf({
    availableLength: 300,
    feasible: true
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAvailability', () => {
    test('should work out the available length for a linear action on its parcel', async () => {
      vi.mocked(getAvailableLength).mockResolvedValue(existingActionsFitLength)

      await getAvailability(
        'm',
        {
          action: linearAction,
          actions,
          agreements,
          compatibilityCheckFn,
          landAction
        },
        mockRequest
      )

      expect(getAvailableLength).toHaveBeenCalledWith(
        linearAction,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        mockPostgresDb,
        mockLogger
      )
    })

    test('should give the available length for a linear action', async () => {
      vi.mocked(getAvailableLength).mockResolvedValue(existingActionsFitLength)

      const availability = await getAvailability(
        'm',
        {
          action: linearAction,
          actions,
          agreements,
          compatibilityCheckFn,
          landAction
        },
        mockRequest
      )

      expect(availability.availableLength).toBe(existingActionsFitLength)
    })

    test('should not work out an available length for an area action', async () => {
      await getAvailability(
        'ha',
        {
          action: areaAction,
          actions,
          agreements,
          compatibilityCheckFn,
          landAction: { ...landAction, actions: [areaAction] }
        },
        mockRequest
      )

      expect(getAvailableLength).not.toHaveBeenCalled()
    })

    test('should give no available length for an area action', async () => {
      const availability = await getAvailability(
        'ha',
        {
          action: areaAction,
          actions,
          agreements,
          compatibilityCheckFn,
          landAction: { ...landAction, actions: [areaAction] }
        },
        mockRequest
      )

      expect(availability.availableLength).toBeUndefined()
    })

    test('should fail when the parcel boundary cannot be read', async () => {
      vi.mocked(getAvailableLength).mockRejectedValue(
        new Error('Unable to read the boundary of land parcel SX0679-9238')
      )

      const availability = getAvailability(
        'm',
        {
          action: linearAction,
          actions,
          agreements,
          compatibilityCheckFn,
          landAction
        },
        mockRequest
      )

      await expect(availability).rejects.toThrow(
        'Unable to read the boundary of land parcel SX0679-9238'
      )
    })
  })

  describe('existingActionsFit', () => {
    test('should say the existing actions fit when they all fit the boundary', () => {
      const fit = existingActionsFit({
        availableLength: existingActionsFitLength
      })

      expect(fit).toBe(true)
    })

    test('should say the existing actions do not fit when they cannot all fit the boundary', () => {
      const fit = existingActionsFit({
        availableLength: existingActionsDoNotFitLength
      })

      expect(fit).toBe(false)
    })

    test('should say the existing actions fit for an area action, whose fit the rules decide', () => {
      const fit = existingActionsFit({ availableLength: undefined })

      expect(fit).toBe(true)
    })
  })

  describe('existingActionsDoNotFitResult', () => {
    test('should fail with the reason /parcels gives and the explanation of what does not fit', () => {
      const result = existingActionsDoNotFitResult({
        availableLength: existingActionsDoNotFitLength
      })

      const { title, content } = doNotFitSection(existingActionsDoNotFitLength)
      expect(result).toEqual({
        passed: false,
        results: [
          {
            name: EXISTING_ACTIONS_DO_NOT_FIT,
            passed: false,
            description: expect.any(String),
            reason: EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
            explanations: [{ title, lines: content }]
          }
        ]
      })
    })
  })
})
