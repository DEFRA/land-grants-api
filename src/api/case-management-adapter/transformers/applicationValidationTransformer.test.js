import { applicationValidationRunToCaseManagement } from './applicationValidationTransformer.js'

describe('applicationValidationRunToCaseManagement', () => {
  test('should return null when input is null', () => {
    expect(applicationValidationRunToCaseManagement(null)).toBeNull()
  })
})
