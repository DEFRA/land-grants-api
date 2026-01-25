import { mockParcelWithActions } from '~/src/api/parcel/fixtures/index.js'
import { parcelsSuccessResponseSchemaV2 } from './parcel.schema.js'

describe('Parcel Schema Validation', () => {
  describe('parcelsSuccessResponseSchemaV2', () => {
    const validResponse = {
      message: 'success',
      parcels: [mockParcelWithActions.parcel]
    }

    it('should validate correct success response', () => {
      const result = parcelsSuccessResponseSchemaV2.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing message', () => {
      const invalid = { ...validResponse, message: undefined }
      const result = parcelsSuccessResponseSchemaV2.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing parcels data', () => {
      const invalid = { ...validResponse, parcels: undefined }
      const result = parcelsSuccessResponseSchemaV2.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing size info in parcels data', () => {
      const invalid = {
        ...validResponse,
        parcels: [{ ...mockParcelWithActions.parcel, size: {} }]
      }
      const result = parcelsSuccessResponseSchemaV2.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing actions in parcels data', () => {
      const invalid = {
        ...validResponse,
        parcels: [{ ...mockParcelWithActions.parcel, actions: {} }]
      }
      const result = parcelsSuccessResponseSchemaV2.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should validate action with sssiConsentRequired', () => {
      const valid = {
        ...validResponse,
        parcels: [
          {
            ...mockParcelWithActions.parcel,
            actions: [
              {
                ...mockParcelWithActions.parcel.actions[0],
                sssiConsentRequired: true
              }
            ]
          }
        ]
      }
      const result = parcelsSuccessResponseSchemaV2.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should reject action with invalid sssiConsentRequired type', () => {
      const invalid = {
        ...validResponse,
        parcels: [
          {
            ...mockParcelWithActions.parcel,
            actions: [
              {
                ...mockParcelWithActions.parcel.actions[0],
                sssiConsentRequired: 'yes'
              }
            ]
          }
        ]
      }
      const result = parcelsSuccessResponseSchemaV2.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })
})
