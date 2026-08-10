import { mockParcelWithActions } from '~/src/features/parcel/fixtures/index.js'
import {
  actionAvailabilitySchema,
  parcelsSchema,
  parcelsSuccessResponseSchema
} from './parcel.schema.js'

describe('Parcel Schema Validation v2', () => {
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

    it('should validate with groups in response', () => {
      const valid = {
        ...validResponse,
        groups: [
          { name: 'Assess moorland', actions: ['CMOR1'] },
          {
            name: 'Livestock grazing on moorland',
            actions: ['UPL1', 'UPL2', 'UPL3']
          }
        ]
      }
      const result = parcelsSuccessResponseSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should validate without groups in response', () => {
      const result = parcelsSuccessResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject groups with missing name', () => {
      const invalid = {
        ...validResponse,
        groups: [{ actions: ['CMOR1'] }]
      }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject groups with missing actions', () => {
      const invalid = {
        ...validResponse,
        groups: [{ name: 'Assess moorland' }]
      }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should validate action with availability and guidanceUrl', () => {
      const valid = {
        ...validResponse,
        parcels: [
          {
            ...mockParcelWithActions.parcel,
            actions: [
              {
                ...mockParcelWithActions.parcel.actions[0],
                guidanceUrl: 'https://www.gov.uk/find-funding',
                availability: { value: null, unit: 'ha', type: 'total' }
              }
            ]
          }
        ]
      }
      const result = parcelsSuccessResponseSchema.validate(valid)
      expect(result.error).toBeUndefined()
    })

    it('should validate action without availability', () => {
      const result = parcelsSuccessResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject availability with invalid type', () => {
      const invalid = {
        ...validResponse,
        parcels: [
          {
            ...mockParcelWithActions.parcel,
            actions: [
              {
                ...mockParcelWithActions.parcel.actions[0],
                availability: { type: 'not-a-real-type' }
              }
            ]
          }
        ]
      }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })

    it('should reject invalid guidanceUrl', () => {
      const invalid = {
        ...validResponse,
        parcels: [
          {
            ...mockParcelWithActions.parcel,
            actions: [
              {
                ...mockParcelWithActions.parcel.actions[0],
                guidanceUrl: 'not-a-url'
              }
            ]
          }
        ]
      }
      const result = parcelsSuccessResponseSchema.validate(invalid)
      expect(result.error).toBeDefined()
    })
  })

  describe('parcelsSchema', () => {
    const validParcelsRequest = {
      sbi: '012345678',
      parcelIds: ['SX0679-9238', 'AB1234-5678'],
      fields: ['size', 'actions'],
      plannedActions: [{ actionCode: 'UPL1', quantity: 0.00001, unit: 'ha' }]
    }

    it('should validate correct parcels request', () => {
      const result = parcelsSchema.validate(validParcelsRequest)
      expect(result.error).toBeUndefined()
    })

    it.each([
      ['single field', ['size']],
      ['sssiConsentRequired field', ['actions.sssiConsentRequired']],
      ['heferRequired field', ['actions.heferRequired']],
      ['groups field', ['groups']]
    ])('should validate with %s', (_name, fields) => {
      const valid = { ...validParcelsRequest, fields }
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
          'actions.sssiConsentRequired',
          'actions.heferRequired',
          'groups'
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

  describe('actionAvailabilitySchema', () => {
    it.each([['ha'], ['count']])(
      'should allow value to be absent with unit %s',
      (unit) => {
        const data = { unit, value: null }

        const result = actionAvailabilitySchema.validate(data)
        expect(result.error).toBeUndefined()
      }
    )

    it('should allow integers with unit = count', () => {
      const data = { unit: 'count', value: 100 }

      const result = actionAvailabilitySchema.validate(data)
      expect(result.error).toBeUndefined()
    })

    it('should reject floats with unit = count', () => {
      const data = { unit: 'count', value: 100.2884 }

      const result = actionAvailabilitySchema.validate(data)
      expect(result.error).toBeDefined()
    })

    it.each([
      ['integer', 100],
      ['float', 100.827]
    ])('should allow %ss with unit = ha', (_name, value) => {
      const data = { unit: 'ha', value }

      const result = actionAvailabilitySchema.validate(data)
      expect(result.error).toBeUndefined()
    })
  })
})
