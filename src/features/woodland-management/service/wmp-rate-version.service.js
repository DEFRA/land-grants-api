import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'
import { getApplicationValidationRun } from '~/src/features/application/queries/getApplicationValidationRun.query.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getActionBySemanticVersion } from '~/src/features/actions/queries/2.0.0/getActionBySemanticVersion.query.js'
import { executePaymentMethod } from '~/src/features/payments-engine/paymentsEngine.js'
import { WMP_ACTION_CODE } from '../constants.js'

/**
 * @typedef {'explicit'|'run'|'latest'} RateVersionSource
 */

/**
 * @typedef {object} RateVersionRequest
 * @property {string} [version] - Exact action config semantic version supplied by the caller
 * @property {number} [validationRunId] - Validation run id whose stored results carry the pinned version
 * @property {string} [applicationId] - Application id the validation run must belong to; when supplied alongside a validation run id the linkage is enforced
 */

/**
 * @typedef {object} RateVersionResolution
 * @property {string|null} semanticVersion - The resolved rate version, null when falling back to latest
 * @property {RateVersionSource} source - How the version was resolved
 */

/**
 * @typedef {object} RateVersionResolutionError
 * @property {string} error - Client-facing error reason
 */

/**
 * Infers the rate version source directly from caller-supplied pinning
 * inputs. Used when auditing failed requests, before any resolution ran.
 * @param {RateVersionRequest} rateVersionRequest - Caller-supplied pinning inputs
 * @returns {RateVersionSource} The inferred source
 */
export const inferRateVersionSource = ({ version, validationRunId }) => {
  if (version) {
    return 'explicit'
  }

  return validationRunId ? 'run' : 'latest'
}

/**
 * Extracts the action config version pinned in a stored application
 * validation run for the given action code.
 * @param {object} data - The stored run payload (`application_results.data`)
 * @param {string} code - Action code to look up
 * @returns {string|null} The pinned semantic version, or null when absent
 */
const extractPinnedRateVersion = (data, code) => {
  const actions = (
    data?.parcelLevelResults?.flatMap((parcel) => parcel?.actions ?? []) ?? []
  ).filter((action) => action?.code === code)

  return actions.at(-1)?.actionConfigVersion ?? null
}

/**
 * Resolves the rate version a WMP payment calculation must use.
 *
 * Precedence: explicit `version`, then the version pinned inside the
 * referenced validation run, then the latest active config (backwards
 * compatible default for claims that pre-date rate pinning). When an
 * `applicationId` is supplied alongside a `validationRunId` the run must
 * belong to that application.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger - The logger
 * @param {object} db - The postgres instance
 * @param {RateVersionRequest} rateVersionRequest - Caller-supplied pinning inputs
 * @returns {Promise<RateVersionResolution | RateVersionResolutionError>} The resolution outcome
 */
export const resolveRateVersion = async (
  logger,
  db,
  { version, validationRunId, applicationId } = {}
) => {
  if (version) {
    return { semanticVersion: version, source: 'explicit' }
  }

  if (validationRunId) {
    const run = await getApplicationValidationRun(logger, db, validationRunId)

    if (!run) {
      return {
        error: `Application validation run '${validationRunId}' not found`
      }
    }

    if (applicationId && run.application_id !== applicationId) {
      return {
        error: `Application validation run '${validationRunId}' does not belong to application '${applicationId}'`
      }
    }

    const pinnedVersion = extractPinnedRateVersion(run.data, WMP_ACTION_CODE)

    if (!pinnedVersion) {
      return {
        error: `Application validation run '${validationRunId}' does not contain a rate version for action code ${WMP_ACTION_CODE}`
      }
    }

    logInfo(logger, {
      category: 'wmp',
      message: 'Resolved WMP rate version from validation run',
      context: { validationRunId, rateVersion: pinnedVersion }
    })

    return { semanticVersion: pinnedVersion, source: 'run' }
  }

  logger.warn(
    {
      event: { category: 'wmp', type: 'warn' }
    },
    `No rate version or validation run id supplied for ${WMP_ACTION_CODE}; calculating at the latest active config`
  )

  return { semanticVersion: null, source: 'latest' }
}

/**
 * Calculates the WMP payment using the requested rate version.
 *
 * When neither a version nor a validation run id is supplied the payment is
 * calculated at the latest active config, preserving pre-existing behaviour.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger - The logger
 * @param {object} dbClient - The postgres instance
 * @param {{totalWoodlandAreaSqm: number} | {oldWoodlandAreaSqm: number, newWoodlandAreaSqm: number}} calcData - The calculation inputs
 * @param {RateVersionRequest} rateVersionRequest - Caller-supplied pinning inputs
 * @returns {Promise<{paymentResult: object, action: object, rateVersion: {value: string|null, source: RateVersionSource}} | RateVersionResolutionError>}
 * The calculation outcome, or an `error` message suitable for a bad-request response
 */
export const calculateWMPPaymentWithRateVersion = async (
  logger,
  dbClient,
  calcData,
  rateVersionRequest = {}
) => {
  const resolution = await resolveRateVersion(logger, dbClient, {
    ...rateVersionRequest
  })

  if ('error' in resolution) {
    return { error: resolution.error }
  }

  const { semanticVersion } = resolution

  let action
  if (semanticVersion) {
    action = await getActionBySemanticVersion(
      logger,
      dbClient,
      WMP_ACTION_CODE,
      semanticVersion
    )

    if (!action) {
      return {
        error: `Action config for ${WMP_ACTION_CODE} at version '${semanticVersion}' not found`
      }
    }
  } else {
    const actions = await getActionsByLatestVersion(logger, dbClient)
    action = actions.find((a) => a.code === WMP_ACTION_CODE) ?? null

    if (!action) {
      return { error: 'Action not found' }
    }
  }

  const paymentResult = executePaymentMethod(
    { ...action.paymentMethod },
    { data: calcData }
  )

  return {
    paymentResult,
    action,
    rateVersion: { value: semanticVersion, source: resolution.source }
  }
}

/**
 * @import { Logger } from '~/src/features/common/logger.d.js'
 */
