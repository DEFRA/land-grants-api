import { cdpUploaderCallbackSchema } from './land-data-ingest.schema.js'

describe('cdpUploaderCallbackSchema', () => {
  const validData = {
    uploadStatus: 'ready',
    numberOfRejectedFiles: 0,
    metadata: {
      customerId: '1234',
      accountId: '1234'
    },
    form: {
      file: {
        s3Key: 'parcels/parcels_head.csv',
        fileStatus: 'complete',
        hasError: false
      }
    }
  }

  it('should allow optional fields to be omitted', () => {
    const { error } = cdpUploaderCallbackSchema.validate(validData)
    expect(error).toBeUndefined()
  })
})
