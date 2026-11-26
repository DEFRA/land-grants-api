import { belowMinimumLengthReason, minimumLength } from './minimum-length.js'
import {
  BOTH_SIDES,
  SINGLE_SIDE
} from '~/src/features/common/constants/sidedness.js'

describe('minimumLength', () => {
  const name = 'minimum-length'

  // By default nothing is committed, so the whole boundary is available
  const createBothSidesApplication = (appliedForQuantity, availability) => ({
    appliedForQuantity,
    landParcel: {
      availability,
      boundaryLength: { totalMeters: availability, incompatibleMeters: 0 },
      sidedness: BOTH_SIDES
    }
  })

  // Billed on both faces, so the available length is twice the free boundary
  const createSingleSideApplication = (appliedForQuantity, availability) => ({
    appliedForQuantity,
    landParcel: {
      availability,
      boundaryLength: { totalMeters: availability / 2, incompatibleMeters: 0 },
      sidedness: SINGLE_SIDE
    }
  })

  const createRule = (config = { minimumLengthM: 20 }) => ({
    name,
    description: 'Check the applied for length meets the configured minimum',
    config
  })

  describe('when the minimum length is not configured', () => {
    test('should fail with an explanation that no minimum is configured', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(50, 300),
        {
          name,
          description:
            'Check the applied for length meets the configured minimum'
        }
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toEqual('Missing config for minimum length')
      expect(result.explanations).toEqual([
        {
          title: 'Minimum length',
          lines: ['No minimum allowable length is configured for this action']
        }
      ])
    })
  })

  describe('checking the available length', () => {
    test('should report the shortfall in available length before a short applied for length', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(15, 10),
        createRule()
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toEqual(
        'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (10 m)'
      )
    })

    test('should fail when the available length is zero', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(20, 0),
        createRule()
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toEqual(
        'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (0 m)'
      )
    })

    test('should fail without an applied for length, as /parcels asks, when the available length is below the minimum', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(undefined, 12),
        createRule()
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toEqual(
        'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (12 m)'
      )
    })

    test('should pass without an applied for length, as /parcels asks, when the available length meets the minimum', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(undefined, 20),
        createRule()
      )

      expect(result.passed).toBe(true)
    })

    test('should fail a single-side action whose physical boundary available is below the minimum', () => {
      const result = minimumLength.execute(
        createSingleSideApplication(undefined, 30),
        createRule()
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toEqual(
        'The minimum allowable length for this action (20 m of boundary, 40 m across both sides) is more than the available length for this land parcel (30 m)'
      )
    })

    test('should pass a single-side action whose physical boundary available equals the minimum', () => {
      const result = minimumLength.execute(
        createSingleSideApplication(undefined, 40),
        createRule()
      )

      expect(result.passed).toBe(true)
    })

    test('should treat an action with no sidedness as both-sides', () => {
      const application = createBothSidesApplication(undefined, 30)
      application.landParcel.sidedness = undefined

      const result = minimumLength.execute(application, createRule())

      expect(result.passed).toBe(true)
    })
  })

  describe('checking the applied for length', () => {
    test('should fail when the applied for length is below the configured minimum', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(15, 300),
        createRule()
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toEqual(belowMinimumLengthReason(20))
    })

    test('should give the configured minimum when the applied for length is below it', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(24, 300),
        createRule({ minimumLengthM: 25 })
      )

      expect(result.reason).toEqual(belowMinimumLengthReason(25))
    })

    test('should pass when the applied for length equals the configured minimum', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(20, 300),
        createRule()
      )

      expect(result.passed).toBe(true)
      expect(result.reason).toEqual(
        'The applied for length meets the minimum allowable length for this action'
      )
    })

    test('should pass when the applied for length is between the minimum and the available length', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(50, 300),
        createRule()
      )

      expect(result.passed).toBe(true)
    })

    test('should pass when the applied for length equals the available length', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(300, 300),
        createRule()
      )

      expect(result.passed).toBe(true)
    })

    test('should leave an applied for length above the available length to the available length rule', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(350, 300),
        createRule()
      )

      expect(result.passed).toBe(true)
    })

    test('should accept one face of a single-side boundary at the minimum length', () => {
      const result = minimumLength.execute(
        createSingleSideApplication(20, 300),
        createRule()
      )

      expect(result.passed).toBe(true)
    })

    test('should fail a single-side applied for length below one face of the minimum', () => {
      const result = minimumLength.execute(
        createSingleSideApplication(19, 300),
        createRule()
      )

      expect(result.reason).toEqual(belowMinimumLengthReason(20))
    })
  })

  describe('explaining the result', () => {
    test('should explain the minimum, the available length and the applied for length', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(50, 300),
        createRule()
      )

      expect(result.explanations).toEqual([
        {
          title: 'Minimum length',
          lines: [
            'The minimum allowable length is (20 m), the available length was (300 m) and the applicant applied for (50 m)',
            'The parcel boundary is (300 m) and (0 m) is already committed to incompatible actions'
          ]
        }
      ])
    })

    test('should explain the minimum and the available length without an applied for length', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(undefined, 300),
        createRule()
      )

      expect(result.explanations[0].lines[0]).toEqual(
        'The minimum allowable length is (20 m) and the available length was (300 m)'
      )
    })

    test('should explain a single-side minimum as boundary and as the length across both sides', () => {
      const result = minimumLength.execute(
        createSingleSideApplication(undefined, 30),
        createRule()
      )

      expect(result.explanations[0].lines[0]).toEqual(
        'The minimum allowable length is (20 m of boundary, 40 m across both sides) and the available length was (30 m)'
      )
    })

    test('should explain an over-committed boundary that has been clamped to zero', () => {
      const application = createBothSidesApplication(50, 0)
      application.landParcel.boundaryLength = {
        totalMeters: 1000,
        incompatibleMeters: 1500
      }

      const result = minimumLength.execute(application, createRule())

      expect(result.passed).toBe(false)
      expect(result.explanations[0].lines[1]).toEqual(
        'The parcel boundary is (1000 m) and (1500 m) is already committed to incompatible actions'
      )
    })

    test('should omit the boundary breakdown when none is supplied', () => {
      const application = createBothSidesApplication(50, 300)
      application.landParcel.boundaryLength = null

      const result = minimumLength.execute(application, createRule())

      expect(result.explanations).toEqual([
        {
          title: 'Minimum length',
          lines: [
            'The minimum allowable length is (20 m), the available length was (300 m) and the applicant applied for (50 m)'
          ]
        }
      ])
    })
  })

  describe('the rule definition', () => {
    test('should use the rule name and description passed in', () => {
      const result = minimumLength.execute(
        createBothSidesApplication(50, 300),
        {
          name: 'custom-rule-name',
          description: 'Custom description',
          config: { minimumLengthM: 20 }
        }
      )

      expect(result.name).toBe('custom-rule-name')
      expect(result.description).toBe('Custom description')
    })

    test('should not declare the applied-for quantity, so /parcels keeps the rule', () => {
      expect(minimumLength.requires).toEqual([{ type: 'AVAILABLE_LENGTH' }])
    })
  })
})
