import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getBoundaryIntersection } from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'
import { METERS } from '~/src/features/common/constants/unit_type.js'
import { executeSingleRuleForEnabledActions } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import {
  heferRequiredActionTransformer,
  sssiConsentRequiredActionTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { splitParcelId } from '~/src/features/parcel/helpers/parcel-id.js'

/**
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 * @import {RuleEngineApplication} from '~/src/features/rules-engine/rules.d.js'
 */

/**
 * Builds the rule engine application for a consent check on one layer. Area
 * actions read intersections[layer]; a displayed linear action's rule reads
 * boundaryIntersections[layer] instead, so that is only measured when one exists.
 * @param {string} layer - The layerName the consent rules refer to
 * @param {Function} areaQuery - The data layer query for the area intersection
 * @param {Action[]} enabledActions - The enabled actions
 * @param {{sheetId: string, parcelId: string}} parcel - The parcel
 * @param {Pool} postgresDb - The postgres database
 * @param {Logger} logger - The logger
 * @returns {Promise<RuleEngineApplication>}
 */
async function getConsentApplication(
  layer,
  areaQuery,
  enabledActions,
  { sheetId, parcelId },
  postgresDb,
  logger
) {
  const hasDisplayedLinearAction = enabledActions.some(
    (a) => a.enabled && a.display && a.applicationUnitOfMeasurement === METERS
  )

  const [areaIntersection, boundaryIntersection] = await Promise.all([
    areaQuery(sheetId, parcelId, DATA_LAYER_TYPES[layer], postgresDb, logger),
    hasDisplayedLinearAction
      ? getBoundaryIntersection(
          sheetId,
          parcelId,
          DATA_LAYER_TYPES[layer],
          postgresDb,
          logger
        )
      : null
  ])

  return {
    appliedForQuantity: 0,
    actionCodeAppliedFor: '',
    landParcel: {
      availableAreaSqm: 0,
      parcelSizeSqm: 0,
      existingAgreements: [],
      intersections: { [layer]: areaIntersection },
      boundaryIntersections: { [layer]: boundaryIntersection },
      availability: 0
    }
  }
}

export async function addSssiConsentRequired(
  parcelIds,
  responseParcels,
  enabledActions,
  logger,
  postgresDb
) {
  const application = await getConsentApplication(
    'sssi',
    getDataLayerQueryAccumulated,
    enabledActions,
    splitParcelId(parcelIds[0]),
    postgresDb,
    logger
  )

  const sssiConsentRequiredAction = executeSingleRuleForEnabledActions(
    rules,
    enabledActions,
    application,
    'sssi-consent-required'
  )

  return sssiConsentRequiredActionTransformer(
    responseParcels,
    sssiConsentRequiredAction
  )
}

export async function addHeferRequired(
  parcelIds,
  responseParcels,
  enabledActions,
  logger,
  postgresDb
) {
  const application = await getConsentApplication(
    'historic_features',
    getDataLayerQueryUnion,
    enabledActions,
    splitParcelId(parcelIds[0]),
    postgresDb,
    logger
  )

  const heferRequiredAction = executeSingleRuleForEnabledActions(
    rules,
    enabledActions,
    application,
    'hefer-consent-required'
  )

  return heferRequiredActionTransformer(responseParcels, heferRequiredAction)
}
