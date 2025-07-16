/* eslint-disable no-console */
import compatibilityMatrix from '~/src/api/common/helpers/seed-data/compatibility-matrix.js'
import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'
import { ParcelsController } from '~/src/api/parcel/controllers/parcels.controller.js'
import actionModel from '../api/actions/models/action.model.js'
import actions from '../api/common/helpers/seed-data/action-data.js'

import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from '~/src/db-tests/setup/postgres.js'
import {
  closeMongo,
  connectMongo,
  createResponseCapture,
  seedMongo
} from '~/src/db-tests/setup/utils.js'

const logger = {
  info: console.info,
  error: console.error,
  warn: console.warn,
  debug: console.debug
}

let connection

describe('Calculate available area with agreements', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(actionModel, 'action-data', actions)
    await seedMongo(
      compatibilityMatrixModel,
      'compatibility-matrix',
      compatibilityMatrix
    )
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      parcels: true,
      covers: true,
      moorland: false,
      agreements: true,
      landCoverCodes: true,
      landCoverCodesActions: true
    })
  }, 60000)

  afterAll(async () => {
    await closeMongo()
    await resetDatabase(connection)
    await connection.end()
  })

  test('should return 1 stack for 1 existing agreement actions', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7268'],
          fields: ['size', 'actions.availableArea', 'actions.results'],
          plannedActions: []
        },
        logger,
        server: {
          postgresDb: connection
        }
      },
      h
    )

    const { data, statusCode } = getResponse()
    expect(statusCode).toBe(200)
    expect(data.message).toBe('success')
    expect(data.parcels).toEqual([
      {
        parcelId: '7268',
        sheetId: 'SD6743',
        size: {
          unit: 'ha',
          value: 0.656374
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'CMOR1: Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - CMOR1', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: CMOR1'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - UPL1', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: UPL1'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - UPL2', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: UPL2'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.49268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - UPL3', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: UPL3'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          }
        ]
      }
    ])
  })

  test('should return 1 stack for 1 existing agreement actions, 1 stack for 1 planned action', async () => {
    const { h, getResponse } = createResponseCapture()

    await ParcelsController.handler(
      {
        payload: {
          parcelIds: ['SD6743-7268'],
          fields: ['size', 'actions.availableArea', 'actions.results'],
          plannedActions: [{ actionCode: 'UPL2', quantity: 0.1, unit: 'ha' }]
        },
        logger,
        server: {
          postgresDb: connection
        }
      },
      h
    )

    const { data, statusCode } = getResponse()

    expect(statusCode).toBe(200)
    expect(data.message).toBe('success')
    expect(data.parcels).toEqual([
      {
        parcelId: '7268',
        sheetId: 'SD6743',
        size: {
          unit: 'ha',
          value: 0.656374
        },
        actions: [
          {
            code: 'CMOR1',
            description: 'CMOR1: Assess moorland and produce a written record',
            availableArea: {
              unit: 'ha',
              value: 0.59268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - CMOR1', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha', 'UPL2 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: CMOR1'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    'Stack 2 - UPL2 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha',
                    'Adding UPL2 (area 0.1 ha)',
                    '  UPL2 is not compatible with: UPL1 in Stack 1',
                    '  Created Stack 2 for UPL2 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          },
          {
            code: 'UPL1',
            description: 'UPL1: Moderate livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - UPL1', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha', 'UPL2 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: UPL1'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    'Stack 2 - UPL2 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha',
                    'Adding UPL2 (area 0.1 ha)',
                    '  UPL2 is not compatible with: UPL1 in Stack 1',
                    '  Created Stack 2 for UPL2 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          },
          {
            code: 'UPL2',
            description: 'UPL2: Low livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - UPL2', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha', 'UPL2 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: UPL2'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    'Stack 2 - UPL2 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha',
                    'Adding UPL2 (area 0.1 ha)',
                    '  UPL2 is not compatible with: UPL1 in Stack 1',
                    '  Created Stack 2 for UPL2 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          },
          {
            code: 'UPL3',
            description: 'UPL3: Limited livestock grazing on moorland',
            availableArea: {
              unit: 'ha',
              value: 0.39268576
            },
            results: {
              totalValidLandCoverSqm: 5926.857555290695,
              stacks: [
                {
                  stackNumber: 1,
                  actionCodes: ['UPL1'],
                  areaSqm: 1000
                },
                {
                  stackNumber: 2,
                  actionCodes: ['UPL2'],
                  areaSqm: 1000
                }
              ],
              explanations: [
                {
                  content: ['Action code - UPL3', 'Parcel Id - SD6743 7268'],
                  title: 'Application Information'
                },
                {
                  content: [
                    '371 - 0.00910078 ha',
                    '551 - 0.01273695 ha',
                    '631 - 0.02538023 ha',
                    '131 - 0.16770771 ha',
                    '551 - 0.01647047 ha',
                    '131 - 0.00479968 ha',
                    '130 - 0.42017837 ha'
                  ],
                  title: 'Land Covers For Parcel'
                },
                {
                  content: ['UPL1 - 0.1 ha', 'UPL2 - 0.1 ha'],
                  title: 'Existing actions'
                },
                {
                  content: [
                    '130 - 131',
                    '240 - 241',
                    '240 - 243',
                    '250 - 251',
                    '250 - 252',
                    '250 - 253',
                    '270 - 271',
                    '280 - 281',
                    '280 - 282',
                    '280 - 283',
                    '280 - 285',
                    '280 - 286',
                    '280 - 287',
                    '280 - 288',
                    '300 - 300',
                    '330 - 347',
                    '580 - 582',
                    '580 - 583',
                    '590 - 591',
                    '590 - 592',
                    '590 - 593',
                    '620 - 621',
                    '640 - 641',
                    '640 - 643',
                    '650 - 651'
                  ],
                  title: 'Valid land covers for action: UPL3'
                },
                {
                  content: [
                    'Stack 1 - UPL1 - 0.1 ha',
                    'Stack 2 - UPL2 - 0.1 ha',
                    '',
                    'Explanation:',
                    'Adding UPL1 (area 0.1 ha)',
                    '  Created Stack 1 for UPL1 with area 0.1 ha',
                    'Adding UPL2 (area 0.1 ha)',
                    '  UPL2 is not compatible with: UPL1 in Stack 1',
                    '  Created Stack 2 for UPL2 with area 0.1 ha'
                  ],
                  title: 'Stacks'
                }
              ]
            }
          }
        ]
      }
    ])
  })
})
