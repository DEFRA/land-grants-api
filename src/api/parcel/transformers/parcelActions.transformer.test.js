import { parcelActionsTransformer } from './parcelActions.transformer.js'
import {
  mockParcel,
  mockActions,
  mockParcelWithActions
} from '~/src/api/parcel/fixtures/index.js'

describe('parcelActionsTransformer', () => {
  it('should transform land parcel and actions correctly', () => {
    const result = parcelActionsTransformer(mockParcel, mockActions)

    expect(result).toEqual(mockParcelWithActions)
  })
})
