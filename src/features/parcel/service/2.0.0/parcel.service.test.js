import { getActionsForParcel } from './parcel.service.js'
import { getUnitByActionCode } from '~/src/features/common/helpers/action-unit.js'
import {
  areaActionsTransformer,
  sizeTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { calculateAvailableLength } from '~/src/features/available-length/availableLength.js'
import { getLandParcelBoundary } from '~/src/features/parcel/queries/getParcelBoundary.query.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { mergeAgreementsTransformer } from '~/src/features/agreements/transformers/agreements.transformer.js'

vi.mock(
  '~/src/features/parcel/transformers/parcelActions.transformer.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      areaActionsTransformer: vi.fn(),
      sizeTransformer: vi.fn()
    }
  }
)
vi.mock('~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js')
vi.mock('~/src/features/available-area/availableArea.js')
vi.mock('~/src/features/available-length/availableLength.js')
vi.mock('~/src/features/parcel/queries/getParcelBoundary.query.js')
vi.mock('~/src/features/available-area/explanations.js')
vi.mock('~/src/features/available-area/availableAreaDataRequirements.js')
vi.mock('~/src/features/agreements/transformers/agreements.transformer.js')

// The two views of enabled-action config that a request works out once,
// as parcels.controller builds them
const prepared = (enabledActions) => ({
  displayedActions: enabledActions.filter((a) => a.display),
  unitByActionCode: getUnitByActionCode(enabledActions)
})

describe('Parcel Service 2.0.0', () => {
  const mockLogger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }

  describe('getActionsForParcel', () => {
    let mockParcel
    let mockPayload
    let mockEnabledActionsForParcel
    let mockRequest
    let mockCompatibilityCheckFn

    // Second argument of the actionTransformer call for that action code:
    // the availability the service worked out for it
    const actionAvailabilityFor = (code) => {
      const [, actionAvailability] = actionTransformer.mock.calls.find(
        ([action]) => action.code === code
      )
      return actionAvailability
    }

    // The warning reads the transformed action, so carry the reason through
    const passUnavailableReasonThrough = () =>
      actionTransformer.mockImplementation((action, calculation) => ({
        code: action.code,
        description: action.description,
        unavailableReason: calculation?.unavailableReason
      }))

    beforeEach(() => {
      vi.clearAllMocks()

      mockParcel = {
        parcel_id: '9238',
        sheet_id: 'SX0679',
        area_sqm: 100000
      }

      mockPayload = {
        fields: ['size', 'actions'],
        plannedActions: [],
        sbi: '123456789'
      }

      mockEnabledActionsForParcel = [
        {
          applicationUnitOfMeasurement: 'ha',
          code: 'UPL1',
          description: 'Action 1',
          display: true
        },
        {
          applicationUnitOfMeasurement: 'ha',
          code: 'UPL2',
          description: 'Action 2',
          display: false
        },
        {
          applicationUnitOfMeasurement: 'sqm',
          code: 'HEF1',
          description: 'Action 3',
          display: true
        }
      ]

      mockRequest = {
        server: { postgresDb: {} },
        logger: mockLogger
      }

      mockCompatibilityCheckFn = vi.fn()

      mergeAgreementsTransformer.mockReturnValue([])
      areaActionsTransformer.mockReturnValue([])
      sizeTransformer.mockImplementation((value) => ({ unit: 'ha', value }))
      getAvailableAreaDataRequirements.mockResolvedValue({
        landCoverToString: 'grass'
      })
      findMaximumAvailableArea.mockReturnValue({
        context: {},
        availableAreaSqm: 5000,
        totalValidLandCoverSqm: 5000,
        feasible: true
      })
      formatExplanationSections.mockReturnValue([])
      actionTransformer.mockImplementation((action) => ({
        code: action.code,
        description: action.description
      }))
    })

    test('should return parcelId and sheetId', async () => {
      const result = await getActionsForParcel(
        mockParcel,
        { ...mockPayload, fields: [] },
        false,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(result).toEqual({
        parcelId: '9238',
        sheetId: 'SX0679'
      })
    })

    test('should include size when size field is requested', async () => {
      const result = await getActionsForParcel(
        mockParcel,
        { ...mockPayload, fields: ['size'] },
        false,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(result.size).toEqual({ unit: 'ha', value: 10 })
    })

    test('should only process actions with display=true', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      // UPL2 has display=false and is skipped; UPL1 (ha) and HEF1 (sqm) both
      // go through AAC since both are area-unit actions.
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(2)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL1',
        'SX0679',
        '9238',
        [],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'HEF1',
        'SX0679',
        '9238',
        [],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )
    })

    test('should not run through AACs for non-area-unit actions (e.g. count)', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        prepared([
          {
            applicationUnitOfMeasurement: 'count',
            code: 'WBD1',
            description: 'Manage ponds',
            display: true
          }
        ]),
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(getAvailableAreaDataRequirements).not.toHaveBeenCalled()
    })

    test('should run building (sqm) actions through AACs', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        prepared([mockEnabledActionsForParcel[2]]),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(1)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'HEF1',
        'SX0679',
        '9238',
        [],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )
    })

    test.each([
      ['building (sqm)', 2],
      ['hectare', 0]
    ])(
      'should still include a %s action with zero available area, so grants-ui sees the recomputed figure rather than a stale one',
      async (_description, actionIndex) => {
        findMaximumAvailableArea.mockReturnValue({
          context: {},
          availableAreaSqm: 0,
          totalValidLandCoverSqm: 0,
          feasible: true
        })

        const result = await getActionsForParcel(
          mockParcel,
          mockPayload,
          false,
          prepared([mockEnabledActionsForParcel[actionIndex]]),
          mockCompatibilityCheckFn,
          mockRequest,
          'token'
        )

        expect(actionTransformer).toHaveBeenCalled()
        expect(result.actions).toHaveLength(1)
      }
    )

    test('should include sqm-configured (e.g. building) actions as area demand alongside hectare actions', async () => {
      const plannedActions = [
        {
          actionCode: 'HEF1',
          quantity: 100,
          unit: 'sqm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        },
        {
          actionCode: 'UPL1',
          quantity: 2,
          unit: 'ha',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        }
      ]
      mergeAgreementsTransformer.mockReturnValue(plannedActions)
      areaActionsTransformer.mockReturnValue([
        { actionCode: 'HEF1', areaSqm: 100 },
        { actionCode: 'UPL1', areaSqm: 20000 }
      ])

      await getActionsForParcel(
        mockParcel,
        { ...mockPayload, plannedActions },
        false,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      // Computing UPL1's (ha) available area now also considers the
      // existing HEF1 (sqm) agreement as area demand - the AAC's own
      // land-cover eligibility decides whether they actually compete.
      expect(areaActionsTransformer).toHaveBeenCalledWith(plannedActions)
    })

    test('should exclude configured non-area (count) actions from area demand', async () => {
      const plannedActions = [
        {
          actionCode: 'WBD1',
          quantity: 2,
          unit: 'count',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        },
        {
          actionCode: 'UPL1',
          quantity: 100,
          unit: 'sqm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        }
      ]
      mergeAgreementsTransformer.mockReturnValue(plannedActions)
      areaActionsTransformer.mockReturnValue([
        { actionCode: 'UPL1', areaSqm: 100 }
      ])

      const enabledActionsWithCount = [
        mockEnabledActionsForParcel[0],
        {
          applicationUnitOfMeasurement: 'count',
          code: 'WBD1',
          description: 'Manage ponds',
          display: true
        }
      ]

      await getActionsForParcel(
        mockParcel,
        { ...mockPayload, plannedActions },
        false,
        prepared(enabledActionsWithCount),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(areaActionsTransformer).toHaveBeenCalledTimes(1)
      expect(areaActionsTransformer).toHaveBeenCalledWith([plannedActions[1]])

      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(1)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL1',
        'SX0679',
        '9238',
        [{ actionCode: 'UPL1', areaSqm: 100 }],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )

      expect(findMaximumAvailableArea).toHaveBeenCalledTimes(1)
      expect(findMaximumAvailableArea).toHaveBeenCalledWith(
        'UPL1',
        [{ actionCode: 'UPL1', areaSqm: 100 }],
        mockCompatibilityCheckFn,
        { landCoverToString: 'grass' }
      )
    })

    test('should judge an agreement by its own unit when its action code has no enabled-action config', async () => {
      const plannedActions = [
        {
          actionCode: 'LEGACY_AREA',
          quantity: 100,
          unit: 'sqm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        },
        {
          actionCode: 'LEGACY_HECTARES',
          quantity: 2,
          unit: 'ha',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        },
        {
          actionCode: 'LEGACY_LENGTH',
          quantity: 500,
          unit: 'm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        }
      ]
      mergeAgreementsTransformer.mockReturnValue(plannedActions)
      areaActionsTransformer.mockReturnValue([
        { actionCode: 'LEGACY_AREA', areaSqm: 100 }
      ])

      await getActionsForParcel(
        mockParcel,
        { ...mockPayload, plannedActions },
        false,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(areaActionsTransformer).toHaveBeenCalledWith([
        plannedActions[0],
        plannedActions[1]
      ])
    })

    test('should include actions in the response when actions field is requested', async () => {
      const result = await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(result.actions).toEqual([
        { code: 'UPL1', description: 'Action 1' },
        { code: 'HEF1', description: 'Action 3' }
      ])
    })

    test('should pass showActionResults through to actionTransformer', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        true,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActionsForParcel[0],
        expect.objectContaining({ availableAreaSqm: 5000 }),
        true
      )
    })

    test('should default showActionResults to false when omitted', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        undefined,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActionsForParcel[0],
        expect.objectContaining({ availableAreaSqm: 5000 }),
        undefined
      )
    })

    test('should merge passed-in existing agreements with planned actions', async () => {
      const upl1 = {
        actionCode: 'UPL1',
        unit: 'ha',
        quantity: 0.5,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      }

      await getActionsForParcel(
        mockParcel,
        mockPayload,
        undefined,
        prepared(mockEnabledActionsForParcel),
        mockCompatibilityCheckFn,
        mockRequest,
        [upl1]
      )

      expect(mergeAgreementsTransformer).toHaveBeenCalledWith([upl1], [])
    })

    describe('area availability', () => {
      test('should not report a reason when the calculation is feasible', async () => {
        await getActionsForParcel(
          mockParcel,
          mockPayload,
          false,
          prepared(mockEnabledActionsForParcel),
          mockCompatibilityCheckFn,
          mockRequest,
          []
        )

        const actionAvailability = actionAvailabilityFor('UPL1')

        expect(actionAvailability.unavailableReason).toBeUndefined()
      })

      describe('when the existing actions do not fit the parcel', () => {
        // Two existing actions the LP could not arrange on the parcel's land covers
        const infeasibleResult = {
          context: {
            existingActions: [
              { actionCode: 'CMOR1', areaSqm: 32000 },
              { actionCode: 'UPL1', areaSqm: 26300 }
            ]
          },
          availableAreaSqm: 0,
          totalValidLandCoverSqm: 41200,
          feasible: false
        }

        test('should still return every displayed action', async () => {
          findMaximumAvailableArea.mockReturnValue(infeasibleResult)

          const result = await getActionsForParcel(
            mockParcel,
            mockPayload,
            false,
            prepared(mockEnabledActionsForParcel),
            mockCompatibilityCheckFn,
            mockRequest,
            []
          )

          expect(result.actions).toEqual([
            { code: 'UPL1', description: 'Action 1' },
            { code: 'HEF1', description: 'Action 3' }
          ])
        })

        test('should report why the existing actions do not fit', async () => {
          findMaximumAvailableArea.mockReturnValue(infeasibleResult)

          await getActionsForParcel(
            mockParcel,
            mockPayload,
            false,
            prepared(mockEnabledActionsForParcel),
            mockCompatibilityCheckFn,
            mockRequest,
            []
          )

          const actionAvailability = actionAvailabilityFor('UPL1')

          expect(actionAvailability.unavailableReason).toEqual({
            code: 'existing-actions-do-not-fit',
            reason:
              'Your existing actions do not fit on this land parcel. Please contact the RPA to resolve this.',
            metadata: {
              existingActions: [
                { actionCode: 'CMOR1', areaHa: 3.2 },
                { actionCode: 'UPL1', areaHa: 2.63 }
              ]
            }
          })
        })

        test('should warn once, naming the parcel and every action affected', async () => {
          findMaximumAvailableArea.mockReturnValue(infeasibleResult)
          passUnavailableReasonThrough()

          await getActionsForParcel(
            mockParcel,
            mockPayload,
            false,
            prepared(mockEnabledActionsForParcel),
            mockCompatibilityCheckFn,
            mockRequest,
            []
          )

          expect(mockLogger.warn).toHaveBeenCalledTimes(1)
          const [, message] = mockLogger.warn.mock.calls[0]
          expect(message).toContain('sheetId=SX0679')
          expect(message).toContain('parcelId=9238')
          expect(message).toContain('actionCodes=UPL1,HEF1')
        })
      })
    })

    describe('linear actions', () => {
      const bnd1 = {
        applicationUnitOfMeasurement: 'm',
        code: 'BND1',
        description: 'Maintain dry stone walls',
        display: true
      }
      const bnd2 = { ...bnd1, code: 'BND2', description: 'Maintain hedgerows' }

      // Every request also carries an area action, as a real parcel would
      const requestActions = (actions) =>
        getActionsForParcel(
          mockParcel,
          mockPayload,
          false,
          prepared([...actions, mockEnabledActionsForParcel[0]]),
          mockCompatibilityCheckFn,
          mockRequest,
          []
        )

      // What calculateAvailableLength reports, varied only where a test cares
      const lengthResult = (overrides = {}) => ({
        availableLength: 240,
        boundaryLengthMeters: 1800,
        incompatibleLengthMeters: 1560,
        exceedsBoundary: false,
        incompatibleActions: [],
        ...overrides
      })

      beforeEach(() => {
        getLandParcelBoundary.mockResolvedValue({
          boundaryLengthMeters: 1800
        })
        calculateAvailableLength.mockReturnValue(lengthResult())
      })

      test('should report the available length', async () => {
        await requestActions([bnd1])

        expect(actionTransformer).toHaveBeenCalledWith(
          bnd1,
          expect.objectContaining({ availableLength: 240 }),
          false
        )
      })

      test('should read the parcel boundary once however many linear actions there are', async () => {
        await requestActions([bnd1, bnd2])

        expect(getLandParcelBoundary).toHaveBeenCalledTimes(1)
        expect(getLandParcelBoundary).toHaveBeenCalledWith(
          'SX0679',
          '9238',
          mockRequest.server.postgresDb,
          mockLogger
        )
      })

      test('should not read the parcel boundary when nothing displayed is measured in metres', async () => {
        await requestActions([])

        expect(getLandParcelBoundary).not.toHaveBeenCalled()
      })

      test('should deduct only the existing actions measured in metres', async () => {
        mergeAgreementsTransformer.mockReturnValue([
          { actionCode: 'BND2', quantity: 300, unit: 'm' },
          { actionCode: 'UPL1', quantity: 2, unit: 'ha' }
        ])

        await requestActions([bnd1])

        expect(calculateAvailableLength).toHaveBeenCalledWith(
          'BND1',
          [{ actionCode: 'BND2', billedLengthMeters: 300 }],
          mockCompatibilityCheckFn,
          1800
        )
      })

      test('should leave a linear action unrestricted when the boundary cannot be read', async () => {
        getLandParcelBoundary.mockResolvedValue(null)

        await requestActions([bnd1])

        expect(calculateAvailableLength).not.toHaveBeenCalled()
        expect(actionTransformer).toHaveBeenCalledWith(bnd1, undefined, false)
      })

      describe('availability', () => {
        const bnd1WithMinimum = {
          ...bnd1,
          rules: [
            {
              name: 'minimum-length',
              description: 'Is the applied for length at least 20 m?',
              config: { minimumLengthM: 20 }
            }
          ]
        }

        describe('when existing actions exceed the boundary', () => {
          beforeEach(() => {
            calculateAvailableLength.mockReturnValue(
              lengthResult({
                availableLength: 0,
                boundaryLengthMeters: 1120,
                incompatibleLengthMeters: 1121,
                exceedsBoundary: true,
                incompatibleActions: [
                  { actionCode: 'BND2', billedLengthMeters: 1121 }
                ]
              })
            )
          })

          test('should report that existing actions do not fit, naming them', async () => {
            await requestActions([bnd1])

            const actionAvailability = actionAvailabilityFor('BND1')

            expect(actionAvailability.unavailableReason).toEqual({
              code: 'existing-actions-do-not-fit',
              reason:
                'Your existing actions do not fit on the available length for this land parcel. Please contact the RPA to resolve this.',
              metadata: {
                existingActions: [
                  { actionCode: 'BND2', billedLengthMeters: 1121 }
                ]
              }
            })
          })

          test('should warn that existing actions do not fit', async () => {
            passUnavailableReasonThrough()

            await requestActions([bnd1])

            const [, message] = mockLogger.warn.mock.calls[0]

            expect(message).toContain('actionCodes=BND1')
          })

          test('should report existing actions not fitting ahead of a parcel too short for the action', async () => {
            calculateAvailableLength.mockReturnValue(
              lengthResult({
                availableLength: 0,
                boundaryLengthMeters: 15,
                incompatibleLengthMeters: 16,
                exceedsBoundary: true
              })
            )

            await requestActions([bnd1WithMinimum])

            const actionAvailability = actionAvailabilityFor('BND1')

            expect(actionAvailability.unavailableReason.code).toBe(
              'existing-actions-do-not-fit'
            )
          })
        })

        describe('when the action has a minimum length', () => {
          test("should report too little length remaining when the existing actions fit but leave less than the minimum, in the rule's own words", async () => {
            calculateAvailableLength.mockReturnValue(
              lengthResult({
                availableLength: 12,
                incompatibleLengthMeters: 1788,
                incompatibleActions: [
                  { actionCode: 'BND2', billedLengthMeters: 1788 }
                ]
              })
            )

            await requestActions([bnd1WithMinimum])

            const actionAvailability = actionAvailabilityFor('BND1')

            expect(actionAvailability.unavailableReason).toEqual({
              code: 'insufficient-length-remaining',
              reason:
                'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (12 m)',
              metadata: {
                existingActions: [
                  { actionCode: 'BND2', billedLengthMeters: 1788 }
                ],
                minimumLengthMeters: 20
              }
            })
          })

          test('should not warn when the existing actions only leave too little for the minimum', async () => {
            passUnavailableReasonThrough()
            calculateAvailableLength.mockReturnValue(
              lengthResult({ availableLength: 12 })
            )

            await requestActions([bnd1WithMinimum])

            expect(mockLogger.warn).not.toHaveBeenCalled()
          })

          test("should report a parcel too short for the action, in the rule's own words", async () => {
            calculateAvailableLength.mockReturnValue(
              lengthResult({
                availableLength: 15,
                boundaryLengthMeters: 15,
                incompatibleLengthMeters: 0
              })
            )

            await requestActions([bnd1WithMinimum])

            const actionAvailability = actionAvailabilityFor('BND1')

            expect(actionAvailability.unavailableReason).toEqual({
              code: 'parcel-too-short-for-action',
              reason:
                'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (15 m)',
              metadata: { boundaryLengthMeters: 15, minimumLengthMeters: 20 }
            })
          })

          test('should leave the action available when what is left meets the minimum', async () => {
            calculateAvailableLength.mockReturnValue(
              lengthResult({ availableLength: 240 })
            )

            await requestActions([bnd1WithMinimum])

            const actionAvailability = actionAvailabilityFor('BND1')

            expect(actionAvailability.unavailableReason).toBeUndefined()
          })
        })

        describe('when the action has no minimum length', () => {
          test('should leave the action available at zero when the existing actions fill the boundary exactly', async () => {
            calculateAvailableLength.mockReturnValue(
              lengthResult({
                availableLength: 0,
                incompatibleLengthMeters: 1800,
                incompatibleActions: [
                  { actionCode: 'BND2', billedLengthMeters: 1800 }
                ]
              })
            )

            await requestActions([bnd1])

            const actionAvailability = actionAvailabilityFor('BND1')

            expect(actionAvailability.unavailableReason).toBeUndefined()
          })
        })
      })
    })
  })
})
