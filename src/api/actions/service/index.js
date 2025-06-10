import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { getParcelAvailableArea } from '~/src/api/land/queries/getParcelAvailableArea.query.js'
import { applicationTransformer } from '~/src/api/actions/transformers/application.transformer.js'

const queries = {
  moorlandInterceptPercentage: getMoorlandInterceptPercentage,
  appliedForTotalAvailableArea: getParcelAvailableArea
}

export const createApplication = async (
  action,
  actions,
  landActions,
  db,
  logger
) => {
  const response = await Promise.all(
    action.rules.map(async (rule) => ({
      rule: rule.data,
      data: await queries[rule.data](landActions, db, logger)
    }))
  )

  return applicationTransformer(
    landActions[0].actions[0].code,
    landActions[0].actions[0].quantity,
    response.find((r) => r.rule === 'appliedForTotalAvailableArea').data,
    response.find((r) => r.rule === 'moorlandInterceptPercentage').data,
    [] // TODO: get existing agreements
  )
}
