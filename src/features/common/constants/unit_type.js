export const HECTARES = 'ha'
export const COUNT = 'count'
export const METERS = 'm'
export const SQM = 'sqm'

export const UNIT_TYPES = [HECTARES, SQM, METERS, COUNT]

// Unit which must be integers
export const INTEGER_UNITS = [SQM, METERS, COUNT]

// Land area reaches us as sqm on agreements and as ha on planned actions
const AREA_UNITS = new Set([HECTARES, SQM])

/**
 * Whether a quantity in this unit competes for a parcel's land area
 * @param {string|undefined} unit
 * @returns {boolean}
 */
export const isAreaUnit = (unit) => AREA_UNITS.has(unit ?? '')
