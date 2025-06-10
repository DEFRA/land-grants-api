import { getActions } from '~/src/api/actions/queries/getActions.query.js'
import actionModel from '~/src/api/actions/models/action.model.js'
import { mockActions } from '~/src/api/actions/fixtures/index.js'
jest.mock('~/src/api/actions/models/action.model.js')

describe('getActions', () => {
  const mockLogger = {
    error: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return all actions', async () => {
    const query = {
      lean: jest.fn().mockResolvedValue(mockActions)
    }
    actionModel.find.mockReturnValue(query)

    const result = await getActions(mockLogger)

    expect(actionModel.find).toHaveBeenCalledWith({
      code: { $in: ['CMOR1', 'UPL1', 'UPL2', 'UPL3'] }
    })
    expect(result).toEqual(mockActions)
  })

  it('should return null when no actions are found', async () => {
    const query = {
      lean: jest.fn().mockResolvedValue(null)
    }
    actionModel.find.mockReturnValue(query)

    const result = await getActions(mockLogger)

    expect(actionModel.find).toHaveBeenCalledWith({
      code: { $in: ['CMOR1', 'UPL1', 'UPL2', 'UPL3'] }
    })
    expect(result).toBeNull()
  })

  it('should throw an error when an error occurs', async () => {
    const query = {
      lean: jest.fn().mockRejectedValue(new Error('Database error'))
    }
    actionModel.find.mockReturnValue(query)

    await expect(getActions(mockLogger)).rejects.toThrow('Database error')
  })
})
