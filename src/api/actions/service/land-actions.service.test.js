import Boom from '@hapi/boom'
import {
  validateLandActions,
  calculatePayment
} from '~/src/api/actions/service/land-actions.service.js'

describe('validateLandActions & calculatePayment', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const landActions = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      sbi: '123456789',
      actions: [
        {
          code: 'BND1',
          quantity: 99
        },
        {
          code: 'BND2',
          quantity: 200
        }
      ]
    }
  ]

  it('validateLandActions should throw a bad request error if no land actions is provided', () => {
    expect(() => validateLandActions(null, mockLogger)).toThrow(Boom.Boom)

    let error
    try {
      validateLandActions(null, mockLogger)
    } catch (err) {
      error = err
    }
    expect(error.isBoom).toBe(true)
    expect(error.output.payload.message).toBe('landActions are required')
  })

  it('validateLandActions should throw a bad request error if land actions list not is provided', () => {
    expect(() => validateLandActions(landActions[0], mockLogger)).toThrow(
      Boom.Boom
    )

    let error
    try {
      validateLandActions(null, mockLogger)
    } catch (err) {
      error = err
    }
    expect(error.isBoom).toBe(true)
    expect(error.output.payload.message).toBe('landActions are required')
  })

  it('calculatePayment should throw a bad request error if no land actions is provided', () => {
    expect(() => calculatePayment(null, mockLogger)).toThrow(Boom.Boom)
    let error
    try {
      calculatePayment(null, mockLogger)
    } catch (err) {
      error = err
    }
    expect(error.isBoom).toBe(true)
    expect(error.output.payload.message).toBe('landActions are required')
  })

  it('should return calculated payments for given valid land actions', async () => {
    const expectedPayment = {
      payment: {
        total: 100.98
      }
    }

    const result = await calculatePayment(landActions, mockLogger)

    expect(result).toEqual(expectedPayment)
  })

  it('should return validation for given valid land actions', async () => {
    const expectedValidationResp = {
      errorMessages: ['BND2 is exceeding max limit 100'],
      valid: false
    }
    const result = await validateLandActions(landActions, mockLogger)

    expect(result).toEqual(expectedValidationResp)
  })
})
