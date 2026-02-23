/* eslint-disable camelcase */
import { vi } from 'vitest'
import {
  DATA_LAYER_QUERY_TYPES,
  DATA_LAYER_TYPES,
  getDataLayerQuery
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getDataLayerScenariosFixtures } from '~/src/tests/db-tests/setup/getDataLayerScenariosFixtures.js'

describe('Data Layer Scenarios', () => {
  let logger, connection
  const fixtures = getDataLayerScenariosFixtures()

  beforeAll(() => {
    logger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test.each(fixtures)(
    `%s`,
    async (_name, { sheet_id, parcel_id, type, overlap_percent }) => {
      const result = await getDataLayerQuery(
        sheet_id,
        parcel_id,
        type === DATA_LAYER_TYPES.sssi
          ? DATA_LAYER_TYPES.sssi
          : DATA_LAYER_TYPES.historic_features,
        type === DATA_LAYER_TYPES.sssi
          ? DATA_LAYER_QUERY_TYPES.accumulated
          : DATA_LAYER_QUERY_TYPES.largest,
        connection,
        logger
      )

      expect(result.intersectingAreaPercentage).toEqual(
        parseFloat(overlap_percent)
      )
    }
  )
})
