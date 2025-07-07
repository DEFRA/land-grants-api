import {
  parcelIdSchema,
  parcelActionsSchema,
  parcelSuccessResponseSchema,
  parcelsSuccessResponseSchema,
  parcelsSchema
} from './parcel.schema.js'
import { mockParcelWithActions } from '~/src/api/parcel/fixtures/index.js'
import { applicationUnitOfMeasurement } from '~/src/api/common/helpers/measurement.js'

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
          unit: applicationUnitOfMeasurement,
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

  describe('parcelsSuccessResponseSchema', () => {
    const validResponse = {
      message: 'success',
      parcels: [mockParcelWithActions.parcel]
    }

    it('should validate correct success response', () => {
      const result = parcelsSuccessResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing message', () => {
      const invalid = { ...validResponse, message: undefined }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing parcels data', () => {
      const invalid = { ...validResponse, parcels: undefined }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing size info in parcels data', () => {
      const invalid = {
        ...validResponse,
        parcels: [{ ...mockParcelWithActions.parcel, size: {} }]
      }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject missing actions in parcels data', () => {
      const invalid = {
        ...validResponse,
        parcels: [{ ...mockParcelWithActions.parcel, actions: {} }]
      }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })

  describe('parcelsSchema', () => {
    const validParcelsRequest = {
      parcelIds: ['SX0679-9238', 'AB1234-5678'],
      fields: ['size', 'actions'],
      currentActions: [{ code: 'UPL1', quantity: 0.00001, unit: 'ha' }]
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

    it('should validate with actions.availableArea field', () => {
      const valid = {
        ...validParcelsRequest,
        fields: ['actions.availableArea']
      }
      const result = parcelsSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should validate with all valid fields', () => {
      const valid = {
        ...validParcelsRequest,
        fields: ['size', 'actions', 'actions.availableArea']
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

    it('should reject non-array currentActions', () => {
      const invalid = { ...validParcelsRequest, currentActions: 'UPL1' }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject array currentActions with invalid quantity', () => {
      const invalid = {
        ...validParcelsRequest,
        currentActions: [{ code: 'UPL1', quantity: null }]
      }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject invalid unit', () => {
      const invalid = {
        ...validParcelsRequest,
        currentActions: [{ code: 'UPL1', quantity: 0.00001, unit: 'acres' }]
      }
      const result = parcelsSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })
})
