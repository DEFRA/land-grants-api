import Hapi from '@hapi/hapi'
import { action } from '../index.js'
import { findAction } from '../helpers/find-action.js'

/** @type { any | null } */
let mockFindActionData = {
  code: 'AB3',
  description: 'Beetle banks',
  payment: {
    amountPerHectare: 573
  },
  eligibilityRules: [{ id: 'is-below-moorland-line' }]
}

jest.mock('../helpers/find-action.js', () => ({
  findAction: jest.fn(() => Promise.resolve(mockFindActionData))
}))

jest.mock('../helpers/update-action.js', () => ({
  updateAction: jest.fn((db, actionCode, action) => {
    mockFindActionData = action
    return Promise.resolve({})
  })
}))

describe('Post Action Rule controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    await server.register([action])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('POST /action/AB3/rule should add a rule successfully', async () => {
    const request = {
      method: 'POST',
      url: '/action/AB3/rule',
      payload: {
        id: 'new-rule',
        config: {}
      }
    }
    /** @type {Hapi.ServerInjectResponse<{message: string}>} */
    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)

    expect(response.result?.message).toBe('Rule added successfully')

    const action = await findAction(request.db, 'AB3')
    expect(action.eligibilityRules.some((rule) => rule.id === 'new-rule')).toBe(
      true
    )
  })

  test('POST /action/NON_EXISTENT/rule should return 404 for non-existent action', async () => {
    const request = {
      method: 'POST',
      url: '/action/NON_EXISTENT/rule',
      payload: {
        id: 'new-rule',
        config: {}
      }
    }

    mockFindActionData = null

    /** @type {Hapi.ServerInjectResponse<{error: string}>} */
    const response = await server.inject(request)
    expect(response.statusCode).toBe(404)
    expect(response.result?.error).toBe('Not Found')
  })

  test('POST /action/AB3/rule should not add duplicate rule', async () => {
    const request = {
      method: 'POST',
      url: '/action/AB3/rule',
      payload: {
        id: 'is-below-moorland-line',
        config: {}
      }
    }

    mockFindActionData = {
      code: 'AB3',
      description: 'Beetle banks',
      payment: {
        amountPerHectare: 573
      },
      eligibilityRules: []
    }

    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)
    const action = await findAction(request.db, 'AB3')
    const ruleCount = action.eligibilityRules.filter(
      (rule) => rule.id === 'is-below-moorland-line'
    ).length
    expect(ruleCount).toBe(1)
  })
})
