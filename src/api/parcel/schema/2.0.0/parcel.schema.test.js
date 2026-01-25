import { mockParcelWithActions } from '~/src/api/parcel/fixtures/index.js'
import {
  parcelsSchema,
  parcelsSuccessResponseSchemaV2
} from './parcel.schema.js'

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

  describe('parcelsSchema', () => {
    const validParcelsRequest = {
      parcelIds: ['SX0679-9238', 'AB1234-5678'],
      fields: ['size', 'actions'],
      plannedActions: [{ actionCode: 'UPL1', quantity: 0.00001, unit: 'ha' }]
    }

    it('should validate correct parcels request', () => {
      const result = parcelsSchema.validate(validParcelsRequest)
      expect(result.error).toBeUndefined()
    })

    it('should validate with single field', () => {
      const valid = {
        ...validParcelsRequest,
        fields: ['size']
      }
      const result = parcelsSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should validate with all valid fields', () => {
      const valid = {
        ...validParcelsRequest,
        fields: [
          'size',
          'actions',
          'actions.results',
          'actions.sssiConsentRequired'
        ]
      }
      const result = parcelsSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing parcelIds', () => {
      const invalid = { ...validParcelsRequest, parcelIds: undefined }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should allow empty parcelIds array', () => {
      const valid = { ...validParcelsRequest, parcelIds: [] }
      const result = parcelsSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid parcel ID format', () => {
      const invalid = {
        ...validParcelsRequest,
        parcelIds: ['invalid-format', 'SX0679-9238']
      }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing fields', () => {
      const invalid = { ...validParcelsRequest, fields: undefined }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should allow empty fields array', () => {
      const valid = { ...validParcelsRequest, fields: [] }
      const result = parcelsSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid field names', () => {
      const invalid = {
        ...validParcelsRequest,
        fields: ['invalidField', 'size']
      }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject non-array parcelIds', () => {
      const invalid = { ...validParcelsRequest, parcelIds: 'SX0679-9238' }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject non-array fields', () => {
      const invalid = { ...validParcelsRequest, fields: 'size' }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject non-array plannedActions', () => {
      const invalid = { ...validParcelsRequest, plannedActions: 'UPL1' }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject array plannedActions with invalid quantity', () => {
      const invalid = {
        ...validParcelsRequest,
        plannedActions: [{ actionCode: 'UPL1', quantity: null }]
      }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject invalid unit', () => {
      const invalid = {
        ...validParcelsRequest,
        plannedActions: [
          { actionCode: 'UPL1', quantity: 0.00001, unit: 'acres' }
        ]
      }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })
})
