import { actions as mockActions } from '~/src/helpers/seed-db/data/actions.js'

const findAction = jest.fn((db, actionCode) =>
  Promise.resolve(mockActions.find((action) => action.code === actionCode))
)

export { findAction }
