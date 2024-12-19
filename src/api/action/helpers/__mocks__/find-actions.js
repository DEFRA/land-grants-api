import { actions as mockActions } from '~/src/helpers/seed-db/data/actions.js'

const findActions = jest.fn((db, actionCodes) => {
  return Promise.resolve(
    mockActions.filter((action) => actionCodes.includes(action.code))
  )
})

export { findActions }
