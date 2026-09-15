import { getMoorlandIntersectPercentage } from './getMoorlandIntersectPercentage.js'
import { getIntersectPercentage } from './getIntersectPercentage.js'
import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'

vi.mock('./getIntersectPercentage.js', () => ({
  getIntersectPercentage: vi.fn()
}))

describe('getMoorlandIntersectPercentage', () => {
  test('should query the LFA layer for the moorland ref codes', async () => {
    const mockDb = {}
    const mockLogger = {}
    vi.mocked(getIntersectPercentage).mockResolvedValue(42)

    const result = await getMoorlandIntersectPercentage(
      'SH123',
      'PA456',
      mockDb,
      mockLogger
    )

    expect(result).toBe(42)
    expect(getIntersectPercentage).toHaveBeenCalledWith(
      {
        sheetId: 'SH123',
        parcelId: 'PA456',
        refCodes: ['M', 'MS', 'MD'],
        dataLayerType: DATA_LAYER_TYPES.less_favoured_areas,
        operationName: 'Get moorland intersect percentage'
      },
      mockDb,
      mockLogger
    )
  })
})
