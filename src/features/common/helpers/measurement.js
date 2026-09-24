import { HECTARES, SQM } from '~/src/features/common/constants/unit_type.js'

export const sqmToHaRounded = (sqm) => {
  const decimalPlaces = 4

  if (typeof sqm === 'string') {
    sqm = Number(sqm)
  }

  if (typeof sqm !== 'number' || Number.isNaN(sqm)) {
    return 0
  }

  const hectares = sqm / 10000

  return (
    Math.round(hectares * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  )
}

export const haToSqm = (ha) => {
  if (typeof ha !== 'number' || Number.isNaN(ha)) {
    return 0
  }

  const sqms = ha * 10000
  return Math.round(sqms)
}

export const roundSqm = (sqm) => {
  return Math.round(Number(sqm) || 0)
}

export const roundTo4DecimalPlaces = (number) => {
  const decimalPlaces = 4

  if (typeof number === 'string') {
    number = Number(number)
  }

  if (typeof number !== 'number' || Number.isNaN(number)) {
    return 0
  }

  return (
    Math.round(number * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  )
}

export const roundTo2DecimalPlaces = (number) => {
  const decimalPlaces = 2

  if (typeof number === 'string') {
    number = Number(number)
  }

  if (typeof number !== 'number' || Number.isNaN(number)) {
    return 0
  }

  return (
    Math.round(number * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  )
}

/**
 * Normalize an applied-for quantity and available area into the unit they
 * should be displayed and compared in, given the action's configured unit.
 * Hectare actions apply for hectares and compare in sqm; sqm actions (e.g.
 * buildings) already apply for and compare in sqm directly.
 * @param {string|undefined} applicationUnitOfMeasurement - The action's configured unit
 * @param {number|string} appliedForQuantity - The quantity applied for, in the action's unit
 * @param {number} availableAreaSqm - The available area, in sqm
 * @returns {{unit: string, appliedAreaDisplay: number, availableAreaDisplay: number, appliedAreaSqm: number, availableAreaSqmDisplay: number}}
 */
export const normalizeAppliedArea = (
  applicationUnitOfMeasurement,
  appliedForQuantity,
  availableAreaSqm
) => {
  if (applicationUnitOfMeasurement === HECTARES) {
    const appliedAreaHa = Number.parseFloat(String(appliedForQuantity)) || 0
    const availableAreaHa = sqmToHaRounded(availableAreaSqm) || 0

    return {
      unit: HECTARES,
      appliedAreaDisplay: appliedAreaHa,
      availableAreaDisplay: availableAreaHa,
      appliedAreaSqm: haToSqm(appliedAreaHa),
      availableAreaSqmDisplay: haToSqm(availableAreaHa)
    }
  }

  const appliedAreaDisplay = roundSqm(appliedForQuantity)
  const availableAreaDisplay = availableAreaSqm || 0

  return {
    unit: applicationUnitOfMeasurement ?? SQM,
    appliedAreaDisplay,
    availableAreaDisplay,
    appliedAreaSqm: appliedAreaDisplay,
    availableAreaSqmDisplay: availableAreaDisplay
  }
}
