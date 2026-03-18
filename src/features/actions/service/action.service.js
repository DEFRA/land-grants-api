import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'
import { getLatestApplicationRunForAppId } from '~/src/features/application/queries/getLatestApplicationRunForAppId.query.js'
import { getActionsByVersion } from '~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js'

/**
 * Get all action configs for the given land actions, pinning versions from any previous validation run.
 * Actions present in a prior run are fetched at their previously-used version; new actions are fetched
 * at their latest version.
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {object} postgresDb - The postgres database instance
 * @param {Array} landActions - The land actions from the request payload
 * @param {string} applicationId - The application id
 * @returns {Promise<Array>} The action configs
 */
const getActions = async (request, postgresDb, landActions, applicationId) => {
  // flatten the land actions so we can deduplicate them by code
  const flattenedLandActions =
    landActions?.flatMap((landAction) =>
      landAction.actions.map((action) => ({
        code: action.code
      }))
    ) ?? []

  logInfo(request.logger, {
    category: 'application',
    message: 'Flattened land actions',
    context: { flattenedLandActions }
  })

  // get the actions from the previous validation run
  const applicationValidationRuns = await getLatestApplicationRunForAppId(
    request.logger,
    postgresDb,
    applicationId
  )

  // extract the actions from the previous validation run
  const previousRunActions =
    applicationValidationRuns?.data?.parcelLevelResults?.flatMap((parcel) =>
      parcel.actions.flatMap((action) => ({
        code: action.code,
        version: action.actionConfigVersion
      }))
    ) ?? []

  logInfo(request.logger, {
    category: 'application',
    message: 'Previous run actions',
    context: { previousRunActions }
  })

  // merge actions, deduplicating by code and preferring versioned entries from previous runs
  const actionMap = new Map(
    flattenedLandActions.map((action) => [action.code, action])
  )

  // deduplicate the actions by code
  for (const action of previousRunActions) {
    actionMap.set(action.code, action)
  }
  const mergedActions = [...actionMap.values()]

  logInfo(request.logger, {
    category: 'application',
    message: 'Merged actions',
    context: { mergedActions }
  })

  // get the actions by version preserving the version they were validated at
  const actionsByVersion = await getActionsByVersion(
    request.logger,
    postgresDb,
    mergedActions
  )

  return actionsByVersion
}

export { getActions }
