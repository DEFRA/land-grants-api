import Boom from '@hapi/boom'
import { quantityValidationFailAction } from './joi-validations.js'

describe('quantityValidationFailAction', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {}
    mockH = {}
  })

  test('should throw 422 error when quantity is negative (number.positive)', () => {
    const validationError = {
      details: [
        {
          path: ['landActions', 0, 'actions', 0, 'quantity'],
          type: 'number.positive',
          message: '"quantity" must be a positive number'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(Boom.Boom)

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 422
        }),
        message: 'Quantity must be a positive number'
      })
    )
  })

  test('should throw 422 error when quantity is a string (number.base)', () => {
    const validationError = {
      details: [
        {
          path: ['landActions', 0, 'actions', 0, 'quantity'],
          type: 'number.base',
          message: '"quantity" must be a number'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(Boom.Boom)

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 422
        }),
        message: 'Quantity must be a positive number'
      })
    )
  })

  test('should throw 422 error when quantity is zero (number.positive)', () => {
    const validationError = {
      details: [
        {
          path: ['quantity'],
          type: 'number.positive',
          message: '"quantity" must be a positive number'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 422
        }),
        message: 'Quantity must be a positive number'
      })
    )
  })

  test('should throw 400 with "Invalid request payload input" for non-quantity validation errors', () => {
    const validationError = {
      details: [
        {
          path: ['code'],
          type: 'string.empty',
          message: '"code" is not allowed to be empty'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 400
        }),
        message: 'Invalid request payload input'
      })
    )
  })

  test('should throw 400 with "Invalid request payload input" when quantity error is different type', () => {
    const validationError = {
      details: [
        {
          path: ['quantity'],
          type: 'number.max',
          message: '"quantity" must be less than or equal to 100'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 400
        }),
        message: 'Invalid request payload input'
      })
    )
  })

  test('should throw 400 with "Invalid request payload input" when error has no details', () => {
    const validationError = new Error('Generic validation error')

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 400
        }),
        message: 'Invalid request payload input'
      })
    )
  })

  test('should throw 400 with "Invalid request payload input" when details array is empty', () => {
    const validationError = {
      details: []
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 400
        }),
        message: 'Invalid request payload input'
      })
    )
  })

  test('should handle multiple validation errors with quantity error present', () => {
    const validationError = {
      details: [
        {
          path: ['code'],
          type: 'string.empty',
          message: '"code" is not allowed to be empty'
        },
        {
          path: ['quantity'],
          type: 'number.positive',
          message: '"quantity" must be a positive number'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 422
        }),
        message: 'Quantity must be a positive number'
      })
    )
  })

  test('should handle nested quantity path', () => {
    const validationError = {
      details: [
        {
          path: ['landActions', 0, 'actions', 0, 'quantity'],
          type: 'number.base',
          message: '"quantity" must be a number'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 422
        })
      })
    )
  })

  test('should throw 400 with "Invalid request payload input" for landActions validation error', () => {
    const validationError = {
      details: [
        {
          path: ['landActions'],
          type: 'array.min',
          message: '"landActions" must contain at least 1 items'
        }
      ]
    }

    expect(() => {
      quantityValidationFailAction(mockRequest, mockH, validationError)
    }).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: 400
        }),
        message: 'Invalid request payload input'
      })
    )
  })
})
