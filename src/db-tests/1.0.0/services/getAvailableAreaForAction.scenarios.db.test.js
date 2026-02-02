/* eslint-disable no-console */
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '../../../available-area/availableArea.js'
import { createCompatibilityMatrix } from '../../../available-area/compatibilityMatrix.js'
import { getAvailableAreaFixtures } from '../../setup/getAvailableAreaFixtures.js'

// scenarioName,sheetId,parcelId,applyingForAction,existingActions,expectedAvailableArea
// CSAM1 - One existing incompatible action with no land cover in common,SD6853,6707,CSAM1,"[{ ""actionCode"": ""WBD1"", ""areaSqm"": 175.07 }]",2.4133
// CMOR1 - One existing incompatible action with land cover in common,SD7164,8058,CMOR1,"[{ ""actionCode"": ""WS1"", ""areaSqm"": 25328.2335  }]",3.1254
// UPL1 - Multiple existing incompatible actions-Existing and new actions are on different land covers,SD7948,4156,UPL1,"[ {  ""actionCode"": ""OP1"" ,  ""areaSqm"": 2000 }, {  ""actionCode"": ""OP2"" ,  ""areaSqm"": 2000 }, {  ""actionCode"": ""OP3"" ,  ""areaSqm"": 2000 }]",3.2844
// CMOR1 - Multiple existing incompatible actions with single stack on mixed land covers,SD8447,1509,CMOR1,"[ {  ""actionCode"": ""CHRW1"" ,  ""areaSqm"": 100000 }, {  ""actionCode"": ""CHRW2"" ,  ""areaSqm"": 80000 }, {  ""actionCode"": ""CHRW3"" ,  ""areaSqm"": 70000 }]",1.1506
// UPL1 - Multiple existing Incompatible actions with multiple stacks on mixed landcovers,SD4957,8307,UPL1,"[ {  ""actionCode"": ""CHRW1"" ,  ""areaSqm"": 60000 }, {  ""actionCode"": ""CHRW2"" ,  ""areaSqm"": 40000 }, {  ""actionCode"": ""CHRW3"" ,  ""areaSqm"": 20000 }, {  ""actionCode"": ""PRF1"" ,  ""areaSqm"": 20000 }, {  ""actionCode"": ""PRF2"" ,  ""areaSqm"": 40000 }, {  ""actionCode"": ""GRH6"" ,  ""areaSqm"": 60000 }, {  ""actionCode"": ""GRH7"" ,  ""areaSqm"": 40000 }]",6.9184
// UPL2 - Multiple compatible and incompatible actions with multiple stacks that need splitting,SD8644,9243,UPL2,"[ {  ""actionCode"": ""CMOR1"" ,  ""areaSqm"": 30000 }, {  ""actionCode"": ""UPL1"" ,  ""areaSqm"": 20000 }, {  ""actionCode"": ""UPL3"" ,  ""areaSqm"": 20000 }, {  ""actionCode"": ""OFM1"" ,  ""areaSqm"": 30000 }, {  ""actionCode"": ""OFM2"" ,  ""areaSqm"": 30000 }, {  ""actionCode"": ""SP1"" ,  ""areaSqm"": 20000 }, {  ""actionCode"": ""WS1"" ,  ""areaSqm"": 40000 },  {  ""actionCode"": ""WS2"" ,  ""areaSqm"": 20000 }]",1.4362

describe('Available Area Calculation Service', () => {
  let logger, connection
  const fixtures = getAvailableAreaFixtures()

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
    `%p`,
    async (
      name,
      {
        applyingForAction,
        sheetId,
        parcelId,
        existingActions: existingActionsStr,
        expectedAvailableArea
      }
    ) => {
      let existingActions = []
      try {
        existingActions = JSON.parse(existingActionsStr)
      } catch (e) {
        logger.error(
          `Error parsing existing actions in CSV file for parcelId ${parcelId}, sheetId ${sheetId}`
        )
      }

      const compatibilityCheckFn = await createCompatibilityMatrix(
        logger,
        connection,
        [
          'CMOR1',
          'UPL1',
          'UPL2',
          'UPL3',
          'SAM1',
          'SPM4',
          'OFM1',
          'OFM2',
          'OFM3',
          'SP1',
          'WS1',
          'WS2',
          'CAHL3',
          'CHRW1',
          'CHRW2',
          'CHRW3',
          'PRF1',
          'PRF2',
          'GRH6',
          'GRH7'
        ]
      )

      const aacDataRequirements = await getAvailableAreaDataRequirements(
        applyingForAction,
        sheetId,
        parcelId,
        existingActions,
        connection,
        logger
      )

      const result = getAvailableAreaForAction(
        applyingForAction,
        sheetId,
        parcelId,
        compatibilityCheckFn,
        existingActions,
        aacDataRequirements,
        logger
      )

      expect(result.availableAreaHectares).toEqual(
        Number(expectedAvailableArea)
      )
    }
  )
})
