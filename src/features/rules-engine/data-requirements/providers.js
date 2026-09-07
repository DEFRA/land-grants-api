import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getMoorlandInterceptPercentage } from '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js'
import { getLfaInterceptPercentage } from '~/src/features/parcel/queries/getLfaInterceptPercentage.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'

/**
 * @import { RequirementDescriptor, RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { RequirementContext, RequirementProvider } from '~/src/features/rules-engine/data-requirements/data-requirements.d.js'
 */

/**
 * Per-layer strategies for the 'intersection' provider. Each returns a value shaped
 * `{ intersectingAreaPercentage, [intersectionAreaHa] }`. Adding a new intersection
 * layer is a matter of adding an entry here.
 * @type {{ [layer: string]: (ctx: RequirementContext) => Promise<object> }}
 */
const intersectionLayerStrategies = {
  moorland: async ({ sheetId, parcelId, db, logger }) => ({
    intersectingAreaPercentage: await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      db,
      logger
    )
  }),
  lfa: async ({ sheetId, parcelId, db, logger }) => ({
    intersectingAreaPercentage: await getLfaInterceptPercentage(
      sheetId,
      parcelId,
      db,
      logger
    )
  }),
  sssi: ({ sheetId, parcelId, db, logger }) =>
    getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      db,
      logger
    ),
  historic_features: ({ sheetId, parcelId, db, logger }) =>
    getDataLayerQueryUnion(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.historic_features,
      db,
      logger
    )
}

/**
 * Registry mapping a requirement `type` to how it is deduped, fetched and applied
 * into the rule engine application. The rules engine stays pure: this is the only
 * place that performs data access, and it runs before `executeRules`. Each entry
 * conforms to the RequirementProvider shape in data-requirements.d.js.
 */
export const requirementProviders = {
  intersection: {
    dedupeKey: (req) => `intersection:${req.layer}`,
    fetch: (req, ctx) => {
      const strategy = intersectionLayerStrategies[req.layer]
      if (!strategy) {
        ctx.logger?.warn?.(
          `No intersection strategy for data layer '${req.layer}'`
        )
        return Promise.resolve(null)
      }
      return strategy(ctx)
    },
    apply: (application, req, value) => {
      application.landParcel.intersections ??= {}
      application.landParcel.intersections[req.layer] = value
    }
  },

  parcelSize: {
    dedupeKey: () => 'parcelSize',
    fetch: (_req, { sheetId, parcelId, db, logger }) =>
      getLandData(sheetId, parcelId, db, logger),
    apply: (application, _req, landParcel) => {
      application.landParcel.parcelSizeSqm = landParcel?.[0]?.area ?? 0
    }
  }
}
