import { mockLandData } from '../fixtures/index.js'
import {
  landParcelIdSchema,
  landParcelSchema,
  landParcelsSuccessResponseSchema
} from './land.schema.js'

describe('Land Data Schema Validation', () => {
  describe('landParcelIdSchema', () => {
    it('should validate correct parcel id format', () => {
      const validParcelId = 'ABC123-2024'
      const result = landParcelIdSchema.validate(validParcelId)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid land parcel id format', () => {
      const invalidLandParcelIds = [
        'SX0679-923', // too short parcel id
        'SX0679-92384', // too long parcel id
        'SX067-9238', // too short sheet id
        'SX06794-9238', // too long sheet id
        'SX0679_9238', // wrong separator
        'SX0679-9238-extra' // extra characters
      ]

      invalidLandParcelIds.forEach((id) => {
        const result = landParcelIdSchema.validate(id)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('landParcelSchema', () => {
    it('should validate correct land parcel actions data', () => {
      const result = landParcelSchema.validate(mockLandData)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing required fields', () => {
      const invalidParcel = {
        sheetId: 'SX0679',
        parcelId: '9238',
        areaSqm: 300
      }

      const result = landParcelSchema.validate(invalidParcel)
      expect(result.error).toBeDefined()
    })
  })

  describe('landParcelsSuccessResponseSchema', () => {
    const validResponse = {
      message: 'Success',
      landParcels: [mockLandData]
    }

    it('should validate correct success response', () => {
      const result = landParcelsSuccessResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing message', () => {
      const invalid = { ...validResponse, message: undefined }
      const result = landParcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing parcel data', () => {
      const invalid = { ...validResponse, parcel: undefined }
      const result = landParcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })
})
