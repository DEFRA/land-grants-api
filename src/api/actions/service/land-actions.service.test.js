import { validateLandActions } from '~/src/api/actions/service/land-actions.service.js'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'

describe('validateLandActions', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return validation for given valid land actions', () => {
    const expectedValidationResp = {
      errorMessages: [
        {
          code: 'BND2',
          description: 'BND2 is exceeding max limit 100'
        }
      ],
      valid: false
    }
    const result = validateLandActions(mockLandActions.landActions, mockLogger)

    expect(result).toEqual(expectedValidationResp)
  })
})
