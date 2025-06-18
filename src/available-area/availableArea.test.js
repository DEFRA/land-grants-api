import { calculateAvailableArea } from './availableArea.js'

function makeCompatibilityCheckFn(compatibilityMap) {
  return (action1, action2) =>
    compatibilityMap[action1]?.includes(action2) ||
    compatibilityMap[action2]?.includes(action1)
}

describe('Available Area calculations', function () {
  const testConditions = [
    [
      'should return total valid land cover when no existing actions',
      {
        totalValidLandCover: 5.9,
        actionsOnParcel: [],
        actionCodeAppliedFor: 'CMOR1',
        expectedAvailableArea: 5.9
      }
    ],
    [
      'should return total valid land cover minus incompatible existing actions',
      {
        totalValidLandCover: 7.777,
        actionsOnParcel: [{ code: 'OFM3', area: 1.5 }],
        actionCodeAppliedFor: 'CMOR1',
        expectedAvailableArea: 6.277
      }
    ],
    [
      'should return total valid land cover without subtracting compatible existing actions',
      {
        totalValidLandCover: 14.123,
        actionsOnParcel: [{ code: 'UPL1', area: 2.41 }],
        actionCodeAppliedFor: 'CMOR1',
        expectedAvailableArea: 14.123,
        compatibilityCheckFn: makeCompatibilityCheckFn({ CMOR1: ['UPL1'] })
      }
    ],
    [
      'should return zero when all valid land covered is used by incompatible action',
      {
        totalValidLandCover: 3.21,
        actionsOnParcel: [{ code: 'CMOR1', area: 3.21 }],
        actionCodeAppliedFor: 'CMOR1',
        expectedAvailableArea: 0
      }
    ],
    [
      'should return zero when there is no valid land cover',
      {
        totalValidLandCover: 0,
        actionsOnParcel: [],
        actionCodeAppliedFor: 'CMOR1',
        expectedAvailableArea: 0
      }
    ],
    [
      'should return total valid land cover when action applied for is compatible with all existing actions',
      {
        totalValidLandCover: 10.12,
        actionsOnParcel: [
          { code: 'CMOR1', area: 10.12 },
          { code: 'UPL1', area: 10.12 }
        ],
        actionCodeAppliedFor: 'UPL7',
        expectedAvailableArea: 10.12,
        compatibilityCheckFn: makeCompatibilityCheckFn({
          UPL7: ['UPL1', 'CMOR1']
        })
      }
    ],
    [
      'should return valid land cover minus incompatible existing actions area',
      {
        totalValidLandCover: 431.5,
        actionsOnParcel: [
          { code: 'CMOR1', area: 100.5 },
          { code: 'UPL1', area: 78.2 }
        ],
        actionCodeAppliedFor: 'CSAM1',
        expectedAvailableArea: 331,
        compatibilityCheckFn: makeCompatibilityCheckFn({
          CMOR1: ['UPL1']
        })
      }
    ]
  ]

  test.each(testConditions)(
    `%p`,
    (
      name,
      {
        totalValidLandCover,
        actionsOnParcel,
        actionCodeAppliedFor,
        expectedAvailableArea,
        compatibilityCheckFn
      }
    ) => {
      expect(
        calculateAvailableArea(
          totalValidLandCover,
          actionsOnParcel,
          actionCodeAppliedFor,
          compatibilityCheckFn
        )
      ).toEqual(expectedAvailableArea)
    }
  )
})
