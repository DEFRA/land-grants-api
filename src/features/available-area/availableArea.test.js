import { findMaximumAvailableArea } from './availableArea.js'

const PERMANENT_GRASSLAND = '130'
const HECTARE_SQM = 10000

// One ten hectare parcel of permanent grassland, used by every test in this
// suite so that the only thing varying between them is the action's
// designation eligibility.
//
// Hectare by hectare:
//   1     no designation
//   2     no designation
//   3     no designation
//   4     no designation
//   5     no designation
//   6     no designation
//   7     sssi
//   8     sssi and historic_feature
//   9     historic_feature
//   10    historic_feature
//
const TEN_HECTARE_PARCEL = {
  landCoverCodesForAppliedForAction: [
    { landCoverCode: '131', landCoverClassCode: PERMANENT_GRASSLAND }
  ],
  landCoversForParcel: [
    { landCoverClassCode: PERMANENT_GRASSLAND, areaSqm: 10 * HECTARE_SQM }
  ],
  landCoversForExistingActions: {},
  sssiOverlap: [
    { landCoverClassCode: PERMANENT_GRASSLAND, areaSqm: 2 * HECTARE_SQM } // Hectares 7 and 8
  ],
  hfOverlap: [
    { landCoverClassCode: PERMANENT_GRASSLAND, areaSqm: 3 * HECTARE_SQM } // Hectares 8, 9 and 10
  ],
  sssiAndHfOverlap: [
    { landCoverClassCode: PERMANENT_GRASSLAND, areaSqm: 1 * HECTARE_SQM } // Hectare 8 only
  ]
}

const availableAreaOn = (actionCode, eligibility) =>
  findMaximumAvailableArea(actionCode, [], () => true, {
    ...TEN_HECTARE_PARCEL,
    sssiActionEligibility:
      'sssi' in eligibility ? { [actionCode]: eligibility.sssi } : {},
    hfActionEligibility:
      'hf' in eligibility ? { [actionCode]: eligibility.hf } : {}
  })

describe('Available area and designation eligibility', () => {
  test('deducts the sssi land when the action is ineligible on sssi only', () => {
    const result = availableAreaOn('CSAM3_26', { sssi: false, hf: true })

    // Loses hectares 7 and 8, keeps 1-6 and 9-10
    expect(result.availableAreaHectares).toBe(8)
  })

  test('deducts the historic_features land when the action is ineligible on historic_features only', () => {
    const result = availableAreaOn('CNUM2_26', { sssi: true, hf: false })

    // Loses hectares 8, 9 and 10, keeps 1-6 and 7
    expect(result.availableAreaHectares).toBe(7)
  })

  test('deducts land carrying either designation once when the action is ineligible on both', () => {
    const result = availableAreaOn('SCR2_26', { sssi: false, hf: false })

    // Loses hectares 7 to 10, keeps 1-6 (hectare 8 is barred once, not twice)
    expect(result.availableAreaHectares).toBe(6)
  })

  test('deducts nothing when the action is eligible on both', () => {
    const result = availableAreaOn('CLIG3_26', { sssi: true, hf: true })

    expect(result.availableAreaHectares).toBe(10)
  })

  // The defect this ticket fixes: an action absent from the mapping file has no
  // eligibility recorded, and absent reads as eligible everywhere.
  test('deducts nothing when the action has no recorded eligibility', () => {
    const result = availableAreaOn('CSAM3_26', {})

    expect(result.availableAreaHectares).toBe(10)
  })
})
