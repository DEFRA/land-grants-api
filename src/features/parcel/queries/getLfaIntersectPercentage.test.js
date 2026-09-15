import { getLfaIntersectPercentage } from './getLfaIntersectPercentage.js'
import { getIntersectPercentage } from './getIntersectPercentage.js'
import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'

vi.mock('./getIntersectPercentage.js', () => ({
  getIntersectPercentage: vi.fn()
}))

describe('getLfaIntersectPercentage', () => {
  test('should query the LFA layer for every LFA ref code', async () => {
    const mockDb = {}
    const mockLogger = {}
    vi.mocked(getIntersectPercentage).mockResolvedValue(42)

    const result = await getLfaIntersectPercentage(
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
        refCodes: ['D', 'S', 'M', 'MS', 'MD'],
        dataLayerType: DATA_LAYER_TYPES.less_favoured_areas,
        operationName: 'Get LFA intersect percentage'
      },
      mockDb,
      mockLogger
    )
  })
})
