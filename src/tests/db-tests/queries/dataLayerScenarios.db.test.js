/* eslint-disable camelcase */
import { vi } from 'vitest'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getDataLayerScenariosFixtures } from '~/src/tests/db-tests/setup/getDataLayerScenariosFixtures.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryLargest
} from '~/src/features/data-layers/queries/getDataLayer.query.js'

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
    async (_name, { sheet_id, parcel_id, overlap_percent }) => {
      const result = await getDataLayerQueryLargest(
        sheet_id,
        parcel_id,
        DATA_LAYER_TYPES.historic_features,
        connection,
        logger
      )

      expect(result.intersectingAreaPercentage).toEqual(
        parseFloat(overlap_percent)
      )
    }
  )
})
