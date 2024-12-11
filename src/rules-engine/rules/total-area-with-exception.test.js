import { rules } from './index.js'

const TOTAL_AREA_WITH_EXCEPTION_RULE_ID = 'total-area-with-exception'
const TOTAL_AREA_WITH_EXCEPTION_RULE_CONFIG = {
  incompatibleAction: 'CIGL1'
}

describe('totalAreaWithException', function () {
  test('should return false if the area applied for is smaller than the total area, and there are no other existing agreements', function () {
    // Arrange
    const application = {
      areaAppliedFor: 40,
      actionCodeAppliedFor: 'CLIG3',
      landParcel: {
        area: 100,
        existingAgreements: []
      }
    }

    // Act
    const result = rules[TOTAL_AREA_WITH_EXCEPTION_RULE_ID](
      application,
      TOTAL_AREA_WITH_EXCEPTION_RULE_CONFIG
    )

    // Assert
    expect(result).toStrictEqual({
      passed: false,
      message:
        'Action code CLIG3 can only use less than the parcel size if existing agreement CIGL1 is applied'
    })
  })

  test('should return true if the area applied for matches the remaining area left by the pre-existing incompatible action', function () {
    // Arrange
    const application = {
      areaAppliedFor: 40,
      actionCodeAppliedFor: 'CLIG3',
      landParcel: {
        area: 100,
        existingAgreements: [{ area: 60, code: 'CIGL1' }]
      }
    }

    // Act
    const result = rules[TOTAL_AREA_WITH_EXCEPTION_RULE_ID](
      application,
      TOTAL_AREA_WITH_EXCEPTION_RULE_CONFIG
    )

    // Assert
    expect(result).toStrictEqual({ passed: true })
  })

  test('should return true when a permitted incompatible action is included in the area', function () {
    // Arrange
    const application = {
      areaAppliedFor: 40,
      actionCodeAppliedFor: 'CLIG3',
      userSelectedActions: [{ actionCode: 'CIGL1' }],
      landParcel: {
        area: 100,
        existingAgreements: []
      }
    }

    // Act
    const result = rules[TOTAL_AREA_WITH_EXCEPTION_RULE_ID](
      application,
      TOTAL_AREA_WITH_EXCEPTION_RULE_CONFIG
    )

    // Assert
    expect(result).toStrictEqual({ passed: true })
  })

  test(`should return false when an incompatible action is included in the area that is not permitted`, function () {
    // Arrange
    const application = {
      areaAppliedFor: 40,
      actionCodeAppliedFor: 'CLIG3',
      userSelectedActions: [{ actionCode: 'CIGL9' }],
      landParcel: {
        area: 100,
        existingAgreements: []
      }
    }

    // Act
    const result = rules[TOTAL_AREA_WITH_EXCEPTION_RULE_ID](
      application,
      TOTAL_AREA_WITH_EXCEPTION_RULE_CONFIG
    )

    // Assert
    expect(result).toStrictEqual({
      passed: false,
      message:
        'Action code CLIG3 can only use less than the parcel size if existing agreement CIGL1 is applied'
    })
  })

  test(`should return false if the area applied for is greater than remaining area left by incompatible action`, function () {
    // Arrange
    const application = {
      areaAppliedFor: 100,
      actionCodeAppliedFor: 'CLIG3',
      landParcel: {
        area: 100,
        existingAgreements: [{ area: 50, code: 'CIGL1' }]
      }
    }

    // Act
    const result = rules[TOTAL_AREA_WITH_EXCEPTION_RULE_ID](
      application,
      TOTAL_AREA_WITH_EXCEPTION_RULE_CONFIG
    )

    // Assert
    expect(result).toStrictEqual({
      passed: false,
      message:
        'Action code CLIG3 is using a larger area than is available after existing agreement CIGL1 is applied'
    })
  })

  test(`should return false if the area applied for is less than remaining area left by incompatible action`, function () {
    // Arrange
    const application = {
      areaAppliedFor: 10,
      actionCodeAppliedFor: 'CLIG3',
      landParcel: {
        area: 100,
        existingAgreements: [{ area: 50, code: 'CIGL1' }]
      }
    }

    // Act
    const result = rules[TOTAL_AREA_WITH_EXCEPTION_RULE_ID](
      application,
      TOTAL_AREA_WITH_EXCEPTION_RULE_CONFIG
    )

    // Assert
    expect(result).toStrictEqual({
      passed: false,
      message:
        'Action code CLIG3 is using a smaller area than is available after existing agreement CIGL1 is applied'
    })
  })
})
