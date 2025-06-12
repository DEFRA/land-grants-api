import {
  actionTransformer,
  parcelTransformer,
  transformSize
} from './parcelActions.transformer.js'
import {
  mockParcel,
  mockParcelWithActions
} from '~/src/api/parcel/fixtures/index.js'
import { mockActions } from '~/src/api/actions/fixtures/index.js'

describe('parcelActions.transformer', () => {
  it('should transform land parcel actions correctly', () => {
    const result = actionTransformer(mockActions[0], 200)

    expect(result).toEqual(mockParcelWithActions.parcel.actions[0])
  })

  it('should transform land parcel and actions correctly', () => {
    const result = parcelTransformer(
      mockParcel,
      mockParcelWithActions.parcel.actions
    )

    expect(result).toEqual(mockParcelWithActions)
  })

  it('should transform size correctly', () => {
    const result = transformSize(mockParcel.area_sqm)

    expect(result).toEqual(mockParcelWithActions.parcel.size)
  })
})
