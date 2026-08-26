import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getActionBySemanticVersion } from '~/src/features/actions/queries/2.0.0/getActionBySemanticVersion.query.js'
import { executePaymentMethod } from '~/src/features/payments-engine/paymentsEngine.js'
import { WMP_ACTION_CODE } from '../constants.js'

/**
 * @typedef {'explicit'|'latest'} RateVersionSource
 */

/**
 * @typedef {object} RateVersionRequest
 * @property {string} [version] - Exact action config semantic version supplied by the caller
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
export const inferRateVersionSource = ({ version }) => {
  return version ? 'explicit' : 'latest'
}

/**
 * Resolves the rate version a WMP payment calculation must use.
 *
 * Precedence: explicit `version`, then the latest active config
 * (backwards compatible default for claims that pre-date rate pinning).
 * @param {Logger} logger - The logger
 * @param {RateVersionRequest} rateVersionRequest - Caller-supplied pinning inputs
 * @returns {RateVersionResolution | RateVersionResolutionError} The resolution outcome
 */
export const resolveRateVersion = (logger, { version } = {}) => {
  if (version) {
    return { semanticVersion: version, source: 'explicit' }
  }

  logger.warn(
    {
      event: { category: 'wmp', type: 'warn' }
    },
    `No rate version supplied for ${WMP_ACTION_CODE}; calculating at the latest active config`
  )

  return { semanticVersion: null, source: 'latest' }
}

/**
 * Calculates the WMP payment using the requested rate version.
 *
 * When no version is supplied the payment is calculated at the latest
 * active config, preserving pre-existing behaviour.
 * @param {Logger} logger - The logger
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
  const resolution = resolveRateVersion(logger, {
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
