import {
  parcelIdSchema,
  parcelActionsSchema,
  parcelSuccessResponseSchema
} from './parcel.schema.js'
import { mockParcelWithActions } from '~/src/api/parcel/fixtures/index.js'

describe('Parcel Schema Validation', () => {
  describe('parcelIdSchema', () => {
    it('should validate correct parcel id format', () => {
      const validParcelId = 'ABC123-2024'
      const result = parcelIdSchema.validate(validParcelId)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid parcel id format', () => {
      const invalidParcelIds = [
        'SX0679-923', // too short parcel id
        'SX0679-92384', // too long parcel id
        'SX067-9238', // too short sheet id
        'SX06794-9238', // too long sheet id
        'SX0679_9238', // wrong separator
        'SX0679-9238-extra' // extra characters
      ]

      invalidParcelIds.forEach((id) => {
        const result = parcelIdSchema.validate(id)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('parcelActionsSchema', () => {
    it('should validate correct parcel actions data', () => {
      const result = parcelActionsSchema.validate(mockParcelWithActions.parcel)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing required fields', () => {
      const invalidParcel = {
        ...mockParcelWithActions.parcel,
        parcelId: undefined
      }
      const result = parcelActionsSchema.validate(invalidParcel)
      expect(result.error).toBeDefined()
    })

    it('should reject invalid size unit', () => {
      const invalid = {
        ...mockParcelWithActions.parcel,
        size: {
          unit: 'acres',
          value: 10.5
        }
      }
      const result = parcelActionsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject negative size value', () => {
      const invalid = {
        ...mockParcelWithActions.parcel,
        size: {
          unit: 'sqm',
          value: -10.5
        }
      }
      const result = parcelActionsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })

  describe('parcelSuccessResponseSchema', () => {
    const validResponse = {
      message: 'Success',
      parcel: mockParcelWithActions.parcel
    }

    it('should validate correct success response', () => {
      const result = parcelSuccessResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing message', () => {
      const invalid = { ...validResponse, message: undefined }
      const result = parcelSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing parcel data', () => {
      const invalid = { ...validResponse, parcel: undefined }
      const result = parcelSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })
})
