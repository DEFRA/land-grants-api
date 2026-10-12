import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getMoorlandIntersectPercentage } from '~/src/features/parcel/queries/getMoorlandIntersectPercentage.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { getLfaIntersectPercentage } from '../../parcel/queries/getLfaIntersectPercentage.js'
import { getSdaIntersectPercentage } from '../../parcel/queries/getSdaIntersectPercentage.js'
import { getBoundaryIntersection } from '../../data-layers/queries/getBoundaryIntersection.query.js'
import { REQUIRED_RULE_DATA } from './requiredRuleData.js'
import { getAvailableArea } from '../../application/service/get-available-area.js'
import { getLandCoversForParcel } from '../../parcel/queries/getLandCoversForParcel.query.js'
import { getLandCoversForAction } from '../../land-cover-codes/queries/getLandCoversForActions.query.js'
import { getAvailableLength } from '../../available-length/availableLength.js'

const intersectionLayerStrategies = {
  moorland: async ({ landAction: { sheetId, parcelId }, db, logger }) => ({
    intersectingAreaPercentage: await getMoorlandIntersectPercentage(
      sheetId,
      parcelId,
      db,
      logger
    )
  }),
  lfa: async ({ landAction: { sheetId, parcelId }, db, logger }) => ({
    intersectingAreaPercentage: await getLfaIntersectPercentage(
      sheetId,
      parcelId,
      db,
      logger
    )
  }),
  sssi: async ({ landAction: { sheetId, parcelId }, db, logger }) =>
    getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      db,
      logger
    ),
  historic_features: async ({
    landAction: { sheetId, parcelId },
    db,
    logger
  }) =>
    getDataLayerQueryUnion(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.historic_features,
      db,
      logger
    ),
  // we dont have any actions configured for severely_disadvantaged_area
  severely_disadvantaged_area: async ({
    landAction: { sheetId, parcelId },
    db,
    logger
  }) => getSdaIntersectPercentage(sheetId, parcelId, db, logger)
}

const boundaryIntersection = {
  sssi: async ({ landAction: { sheetId, parcelId }, db, logger }) =>
    getBoundaryIntersection(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      db,
      logger
    ),
  historic_features: async ({
    landAction: { sheetId, parcelId },
    db,
    logger
  }) =>
    getBoundaryIntersection(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.historic_features,
      db,
      logger
    )
}

export const requirementProviders = {
  [REQUIRED_RULE_DATA.INTERSECTION]: {
    dedupeKey: (req) => `intersection:${req.layer}`,
    fetch: (req, ctx) => {
      const strategy = intersectionLayerStrategies[req.layer]
      if (!strategy) {
        ctx.logger?.warn?.(
          `No intersection strategy for data layer '${req.layer}'`
        )
        return null
      }
      return strategy(ctx)
    },
    apply: (application, req, value) => {
      application.landParcel.intersections ??= {}
      application.landParcel.intersections[req.layer] = value
    }
  },
  [REQUIRED_RULE_DATA.BOUNDARY_INTERSECTION]: {
    dedupeKey: (req) => `boundaryIntersection:${req.layer}`,
    fetch: (req, ctx) => {
      const strategy = boundaryIntersection[req.layer]
      if (!strategy) {
        ctx.logger?.warn?.(
          `No boundary intersection strategy for data layer '${req.layer}'`
        )
        return null
      }
      return strategy(ctx)
    },
    apply: (application, req, value) => {
      application.boundaryIntersection ??= {}
      application.boundaryIntersection[req.layer] = value
    }
  },
  [REQUIRED_RULE_DATA.PARCEL_SIZE]: {
    dedupeKey: () => 'parcelSize',
    fetch: (_req, { landAction: { sheetId, parcelId }, db, logger }) =>
      getLandData(sheetId, parcelId, db, logger),
    apply: (application, _req, landParcel) => {
      application.landParcel.parcelSizeSqm = landParcel?.[0]?.area ?? 0
    }
  },
  [REQUIRED_RULE_DATA.AVAILABLE_AREA]: {
    dedupeKey: () => 'availableArea',
    fetch: async (
      _req,
      {
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        db,
        logger
      }
    ) =>
      getAvailableArea(
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        db,
        logger
      ),
    apply: (application, _req, value) => {
      application.landParcel.availableArea = value
      application.landParcel.availableAreaSqm = value.availableAreaSqm
    }
  },
  [REQUIRED_RULE_DATA.AVAILABLE_LENGTH]: {
    dedupeKey: () => 'availableLength',
    fetch: async (
      _req,
      {
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        db,
        logger
      }
    ) => {
      return getAvailableLength(
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        db,
        logger
      )
    },
    apply: (application, _req, value) => {
      application.landParcel.availableLength = value
    }
  },
  [REQUIRED_RULE_DATA.LAND_COVERS]: {
    dedupeKey: () => 'landCovers',
    fetch: async (_req, { landAction: { sheetId, parcelId }, db, logger }) =>
      getLandCoversForParcel(sheetId, parcelId, db, logger),
    apply: (application, _req, value) => {
      application.landParcel.landCovers = value
    }
  },
  [REQUIRED_RULE_DATA.ACTION_LAND_COVERS]: {
    dedupeKey: () => 'actionLandCovers',
    fetch: async (_req, { action, db, logger }) =>
      getLandCoversForAction(action.code, db, logger),
    apply: (application, _req, value) => {
      application.actionLandCovers = value
    }
  }
}
