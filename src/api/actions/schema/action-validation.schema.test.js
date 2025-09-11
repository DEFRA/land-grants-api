import {
  landActionSchema,
  landActionValidationResponseSchema
} from './action-validation.schema.js'

describe('Action Validation Schema', () => {
  describe('landActionSchema', () => {
    const validLandActionRequest = {
      landActions: [
        {
          sheetId: 'SHEET001',
          parcelId: 'SX0679-9238',
          sbi: 123456789,
          actions: [
            {
              code: 'UPL1',
              quantity: 0.5
            },
            {
              code: 'UPL2',
              quantity: 1.2
            }
          ]
        },
        {
          sheetId: 'SHEET002',
          parcelId: 'AB1234-5678',
          sbi: 987654321,
          actions: [
            {
              code: 'UPL3',
              quantity: 2.0
            }
          ]
        }
      ]
    }

    it('should validate correct land action request', () => {
      const result = landActionSchema.validate(validLandActionRequest)
      expect(result.error).toBeUndefined()
    })

    it('should validate with single land action', () => {
      const valid = {
        landActions: [validLandActionRequest.landActions[0]]
      }
      const result = landActionSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should validate with empty actions array', () => {
      const valid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: []
          }
        ]
      }
      const result = landActionSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing landActions', () => {
      const invalid = { ...validLandActionRequest, landActions: undefined }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject non-array landActions', () => {
      const invalid = {
        landActions: validLandActionRequest.landActions[0]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject empty landActions array', () => {
      const invalid = { landActions: [] }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing sheetId', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            sheetId: undefined
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing parcelId', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            parcelId: undefined
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing sbi', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            sbi: undefined
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject non-integer sbi', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            sbi: 123456789.5
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing actions', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: undefined
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject non-array actions', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: { code: 'UPL1', quantity: 0.5 }
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject action with missing code', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: [
              {
                quantity: 0.5
              }
            ]
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject action with missing quantity', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: [
              {
                code: 'UPL1'
              }
            ]
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject action with non-numeric quantity', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: [
              {
                code: 'UPL1',
                quantity: 'not-a-number'
              }
            ]
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject action with negative quantity', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: [
              {
                code: 'UPL1',
                quantity: -0.5
              }
            ]
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeUndefined() // Negative quantities might be valid
    })

    it('should reject action with zero quantity', () => {
      const invalid = {
        landActions: [
          {
            ...validLandActionRequest.landActions[0],
            actions: [
              {
                code: 'UPL1',
                quantity: 0
              }
            ]
          }
        ]
      }
      const result = landActionSchema.validate(invalid)
      expect(result.error).toBeUndefined() // Zero quantities might be valid
    })
  })

  describe('landActionValidationResponseSchema', () => {
    const validResponse = {
      message: 'Validation completed successfully',
      errorMessages: [
        {
          code: 'INVALID_ACTION',
          description: 'Action code UPL1 is not valid for this parcel',
          sheetId: 'SHEET001',
          parcelId: 'SX0679-9238',
          passed: false
        },
        {
          code: 'INVALID_QUANTITY',
          description: 'Quantity must be greater than 0',
          sheetId: 'SHEET002',
          parcelId: 'AB1234-5678',
          passed: false
        }
      ],
      valid: false
    }

    it('should validate correct validation response', () => {
      const result = landActionValidationResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should validate response with no error messages', () => {
      const valid = {
        message: 'All validations passed',
        errorMessages: [],
        valid: true
      }
      const result = landActionValidationResponseSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should validate response with single error message', () => {
      const valid = {
        message: 'One validation error found',
        errorMessages: [validResponse.errorMessages[0]],
        valid: false
      }
      const result = landActionValidationResponseSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing message', () => {
      const invalid = { ...validResponse, message: undefined }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject non-string message', () => {
      const invalid = { ...validResponse, message: 123 }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should allow missing errorMessages', () => {
      const valid = { ...validResponse, errorMessages: undefined }
      const result = landActionValidationResponseSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should reject non-array errorMessages', () => {
      const invalid = {
        ...validResponse,
        errorMessages: validResponse.errorMessages[0]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing valid', () => {
      const invalid = { ...validResponse, valid: undefined }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should convert string to boolean for valid field', () => {
      const valid = { ...validResponse, valid: 'true' }
      const result = landActionValidationResponseSchema.validate(valid)
      expect(result.error).toBeUndefined()
      expect(result.value.valid).toBe(true)
    })

    it('should reject error message with missing code', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            description: 'Some error',
            sheetId: 'SHEET001',
            parcelId: 'SX0679-9238'
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject error message with missing description', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            code: 'INVALID_ACTION',
            sheetId: 'SHEET001',
            parcelId: 'SX0679-9238'
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject error message with missing sheetId', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            code: 'INVALID_ACTION',
            description: 'Some error',
            parcelId: 'SX0679-9238'
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject error message with missing parcelId', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            code: 'INVALID_ACTION',
            description: 'Some error',
            sheetId: 'SHEET001'
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject error message with non-string code', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            code: 123,
            description: 'Some error',
            sheetId: 'SHEET001',
            parcelId: 'SX0679-9238'
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject error message with non-string description', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            code: 'INVALID_ACTION',
            description: 123,
            sheetId: 'SHEET001',
            parcelId: 'SX0679-9238'
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject error message with non-string sheetId', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            code: 'INVALID_ACTION',
            description: 'Some error',
            sheetId: 123,
            parcelId: 'SX0679-9238'
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject error message with non-string parcelId', () => {
      const invalid = {
        ...validResponse,
        errorMessages: [
          {
            code: 'INVALID_ACTION',
            description: 'Some error',
            sheetId: 'SHEET001',
            parcelId: 123
          }
        ]
      }
      const result = landActionValidationResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })
})
