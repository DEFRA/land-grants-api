import { REQUIRED_RULE_DATA } from '../../services/requiredRuleData.js'

/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * The share of the boundary lying inside the layer, to match the percentage the
 * area consent rules report to Caseworking and GAS. Rounded as they are, to two
 * decimals. Informational only - the caveat is still decided on toleranceMeters.
 * @param {number} intersectingLengthMeters - The boundary inside the layer
 * @param {number} boundaryLengthMeters - The parcel's whole perimeter
 * @returns {number} The overlap as a percentage, to two decimals
 */
function calculatePercentageOverlap(
  intersectingLengthMeters,
  boundaryLengthMeters
) {
  if (boundaryLengthMeters <= 0) {
    return 0
  }

  const overlapPercent = (intersectingLengthMeters / boundaryLengthMeters) * 100

  return Number.parseFloat(overlapPercent.toFixed(2))
}

// Boundary-length counterpart to sssi/hefer-consent-required, for linear actions
export const boundaryIntersectionConsentRequired = {
  requires: [{ type: REQUIRED_RULE_DATA.BOUNDARY_INTERSECTION }],
  /**
   * @param {RuleEngineApplication} application - The application to execute the rule on
   * @param {ActionRule} rule - The rule to execute
   * @returns {RuleResultItem} - The result of the rule
   */
  execute: (application, rule) => {
    const {
      layerName,
      caveatCode,
      caveatDescription,
      toleranceMeters = 0
    } = rule.config ?? {}
    const name = rule.name

    if (!layerName || !caveatCode) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: 'Missing config for boundary intersection consent',
        explanations: [
          {
            title: 'Boundary intersection',
            lines: ['No layerName or caveatCode is configured for this rule']
          }
        ]
      }
    }

    /** @type {string[]} */
    const lines = []
    const explanations = [{ title: `${layerName} boundary check`, lines }]
    const boundaryIntersection =
      application?.landParcel?.boundaryIntersections?.[layerName]

    if (boundaryIntersection == null) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `A boundary intersection with the ${layerName} layer was not provided in the application data`,
        explanations
      }
    }

    const { intersectingLengthMeters, boundaryLengthMeters } =
      boundaryIntersection

    lines.push(
      `The parcel boundary is (${boundaryLengthMeters} m) and (${intersectingLengthMeters} m) of it is inside the ${layerName} layer. The tolerance is (${toleranceMeters} m).`
    )

    const isConsentRequired = intersectingLengthMeters > toleranceMeters

    if (!isConsentRequired) {
      return {
        name,
        passed: true,
        description: rule.description,
        reason: `No consent is required for the ${layerName} layer`,
        explanations
      }
    }

    const { parcelId, sheetId, actionCode } = application

    return {
      name,
      passed: true,
      description: rule.description,
      reason: caveatDescription,
      explanations,
      caveat: {
        code: caveatCode,
        description: caveatDescription,
        metadata: {
          actionCode,
          parcelId,
          sheetId,
          percentageOverlap: calculatePercentageOverlap(
            intersectingLengthMeters,
            boundaryLengthMeters
          ),
          overlapLengthMeters: intersectingLengthMeters,
          boundaryLengthMeters
        }
      }
    }
  }
}
