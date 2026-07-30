import { vi } from 'vitest';
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js';
import { getDataLayerScenariosFixtures } from '~/src/tests/db-tests/setup/getDataLayerScenariosFixtures.js';
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js';

describe('Data Layer Scenarios', () => {
  let logger, connection;
  const fixtures = getDataLayerScenariosFixtures();

  beforeAll(() => {
    logger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn()
    };
    connection = connectToTestDatabase();
  });

  afterAll(async () => {
    await connection.end();
  });

  test.each(fixtures)(
    `%s`,
    async (
      _name,
      {
        sheet_id: sheetId,
        parcel_id: parcelId,
        overlap_percent: overlapPercent
      }
    ) => {
      const result = await getDataLayerQueryUnion(
        sheetId,
        parcelId,
        DATA_LAYER_TYPES.historic_features,
        connection,
        logger
      );

      expect(result.intersectingAreaPercentage).toEqual(
        parseFloat(overlapPercent)
      );
    }
  );
});
