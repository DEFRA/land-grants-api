import { farmers } from './farmers.js'
import { actions, populateActionClasses } from './actions.js'
import { codes } from './codes.js'
import { optionsData } from './options-data.js'

export default {
  farmers,
  actions: populateActionClasses(actions),
  codes,
  'options-data': optionsData
}
