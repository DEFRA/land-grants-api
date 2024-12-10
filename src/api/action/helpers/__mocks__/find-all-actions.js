import { actions as mockActions } from '~/src/helpers/seed-db/data/actions.js'

const findAllActions = jest.fn(() => Promise.resolve(mockActions))

export { findAllActions }
