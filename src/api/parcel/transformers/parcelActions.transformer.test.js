import { parcelActionsTransformer } from './parcelActions.transformer.js'
import {
  mockParcel,
  mockParcelWithActions
} from '~/src/api/parcel/fixtures/index.js'
import { mockActions } from '~/src/api/actions/fixtures/index.js'

describe('parcelActionsTransformer', () => {
  it('should transform land parcel and actions correctly', () => {
    const result = parcelActionsTransformer(mockParcel, mockActions, 200)

    expect(result).toEqual(mockParcelWithActions)
  })
})
