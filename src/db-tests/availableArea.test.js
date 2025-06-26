import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'
import { calculateAvailableArea } from '~/src/available-area/index.js'
import compatibilityMatrix from '~/src/db-tests/fixtures/compatibility-matrix.json'
import {
  connectMongo,
  seedMongo,
  closeMongo
} from '~/src/db-tests/setup/utils.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Calculate available area', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(
      compatibilityMatrixModel,
      'compatibility-matrix',
      compatibilityMatrix
    )
  })

  afterAll(async () => {
    await closeMongo()
  })

  test('should return zero stacks for zero action', async () => {
    const actions = []
    const result = await calculateAvailableArea(logger, actions)

    expect(result).toEqual({
      explanations: ['No existing actions so no stacks are needed'],
      stacks: []
    })
  })

  test('should return 1 stack for one action', async () => {
    const actions = [{ code: 'CMOR1', areaSqm: 3 }]
    const result = await calculateAvailableArea(logger, actions)

    expect(result).toEqual({
      explanations: [
        'Adding CMOR1 (area 0.0003 ha)',
        '  Created Stack 1 for CMOR1 with area 0.0003 ha'
      ],
      stacks: [
        {
          stackNumber: 1,
          actionCodes: ['CMOR1'],
          areaSqm: 3
        }
      ]
    })
  })

  test('should return 1 stack for two actions', async () => {
    const actions = [
      { code: 'CMOR1', areaSqm: 3 },
      { code: 'UPL1', areaSqm: 3 }
    ]
    const result = await calculateAvailableArea(logger, actions)

    expect(result).toEqual({
      explanations: [
        'Adding CMOR1 (area 0.0003 ha)',
        '  Created Stack 1 for CMOR1 with area 0.0003 ha',
        'Adding UPL1 (area 0.0003 ha)',
        '  UPL1 is compatible with: CMOR1 in Stack 1',
        '  Added UPL1 to Stack 1 with area 0.0003 ha'
      ],
      stacks: [
        {
          stackNumber: 1,
          actionCodes: ['CMOR1', 'UPL1'],
          areaSqm: 3
        }
      ]
    })
  })
})
