import { applicationValidationResponseSchemaV2 } from './application-validation.schema.js'

// Regression coverage for the caveat.metadata conditional: hefer-consent-required is a
// GIS overlap rule (used by WBD1, a hectare/m2-measured action) and must always report
// percentageOverlap/overlapAreaHectares; pond-check-required is WBD1's manual-check-required
// caveat (a unit/item check) and has no overlap to report. A previous version of this
// schema required both fields unconditionally, which made the API 500 on any
// manual-check-required response - see wbd1-1.0.0.spec.js in grants-config-land-grants.
describe('applicationValidationResponseSchemaV2', () => {
  const buildResponse = (caveat) => ({
    message: 'Application validated successfully',
    id: 1,
    valid: true,
    actions: [
      {
        actionCode: 'WBD1',
        sheetId: 'SD5649',
        parcelId: '9215',
        hasPassed: true,
        version: '1.0.0',
        rules: [
          {
            name: caveat.code,
            passed: true,
            caveat
          }
        ]
      }
    ]
  })

  describe('hefer-consent-required (GIS overlap rule)', () => {
    it('accepts a caveat with percentageOverlap and overlapAreaHectares', () => {
      const { error } = applicationValidationResponseSchemaV2.validate(
        buildResponse({
          code: 'hefer-consent-required',
          description: 'A hefer is needed from Historic England',
          metadata: {
            actionCode: 'WBD1',
            parcelId: '9215',
            sheetId: 'SD5649',
            percentageOverlap: 5,
            overlapAreaHectares: 0.05
          }
        })
      )
      expect(error).toBeUndefined()
    })

    it('accepts a caveat missing percentageOverlap', () => {
      const { error } = applicationValidationResponseSchemaV2.validate(
        buildResponse({
          code: 'hefer-consent-required',
          description: 'A hefer is needed from Historic England',
          metadata: {
            actionCode: 'WBD1',
            parcelId: '9215',
            sheetId: 'SD5649',
            overlapAreaHectares: 0.05
          }
        })
      )
      expect(error).toBeUndefined()
    })

    it('accepts a caveat missing overlapAreaHectares', () => {
      const { error } = applicationValidationResponseSchemaV2.validate(
        buildResponse({
          code: 'hefer-consent-required',
          description: 'A hefer is needed from Historic England',
          metadata: {
            actionCode: 'WBD1',
            parcelId: '9215',
            sheetId: 'SD5649',
            percentageOverlap: 5
          }
        })
      )
      expect(error).toBeUndefined()
    })
  })

  describe('pond-check-required (manual-check-required rule)', () => {
    it('accepts a caveat with no overlap metadata', () => {
      const { error } = applicationValidationResponseSchemaV2.validate(
        buildResponse({
          code: 'pond-check-required',
          description: 'A manual pond check is required',
          metadata: {
            actionCode: 'WBD1',
            parcelId: '9215',
            sheetId: 'SD5649'
          }
        })
      )
      expect(error).toBeUndefined()
    })
  })
})
