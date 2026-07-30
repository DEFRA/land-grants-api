import { executeRules } from '~/src/features/rules-engine/rulesEngine.js';
import { rules } from '~/src/features/rules-engine/rules/index.js';
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js';
import { haToSqm } from '../../common/helpers/measurement.js';
import { WMP_ACTION_CODE } from '../constants.js';
import { getActionsByLatestVersion } from '../../actions/queries/2.0.0/getActionsByLatestVersion.query.js';
import { executePaymentMethod } from '../../payments-engine/paymentsEngine.js';

/**
 * @param {LandParcelDb[]|null} parcels - The parcels
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {Promise<import('../wmp.d.js').WMPResponse>}
 */
export const validateWoodlandManagementPlan = async (parcels, request) => {
  /** @type {import('../wmp.d.js').WMPRequest} */
  // @ts-expect-error - payload
  const { oldWoodlandAreaHa, newWoodlandAreaHa } = request.payload;
  const {
    logger,
    // @ts-expect-error - postgresDb
    server: { postgresDb }
  } = request;

  const totalParcelAreaSqm = getTotalLandAreaSqm(parcels);
  const actions = await getEnabledActions(logger, postgresDb);
  const action = actions.find((a) => a.code === WMP_ACTION_CODE);
  const ruleResult = executeRules(
    rules,
    /** @type {import('~/src/features/rules-engine/rules.d.js').RuleEngineApplication} */
    {
      oldWoodlandAreaSqm: haToSqm(oldWoodlandAreaHa),
      newWoodlandAreaSqm: haToSqm(newWoodlandAreaHa),
      totalParcelAreaSqm
    },
    action?.rules
  );

  return { action, ruleResult };
};

/**
 * @param {LandParcelDb[]|null} parcels - The parcels
 * @returns {number} The total land area in square meters
 */
const getTotalLandAreaSqm = (parcels) => {
  return parcels?.reduce((acc, parcel) => acc + parcel.area, 0) ?? 0;
};

/**
 * @param {Logger} logger
 * @param {object} dbClient
 * @param {{totalWoodlandAreaSqm: number} | {oldWoodlandAreaSqm: number, newWoodlandAreaSqm: number}} data
 */
export const calculateWMPPayment = async (logger, dbClient, data) => {
  const actions = await getActionsByLatestVersion(logger, dbClient);
  const action = actions.find((a) => a.code === WMP_ACTION_CODE);

  if (!action) {
    throw new Error('Action not found');
  }

  const paymentResult = executePaymentMethod(
    { ...action?.paymentMethod },
    {
      data
    }
  );

  return { result: paymentResult, action }
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 */
