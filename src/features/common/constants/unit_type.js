export const HECTARES = 'ha'
export const COUNT = 'count'
export const METERS = 'm'
const SQM = 'sqm'

export const UNIT_TYPES = [HECTARES, SQM, METERS, COUNT]

// Unit which must be integers
export const INTEGER_UNITS = [SQM, METERS, COUNT]

// Land area reaches us as sqm on agreements and as ha on planned actions
const AREA_UNITS = [HECTARES, SQM]

/**
 * Whether a quantity in this unit competes for a parcel's land area
 * @param {string} unit
 * @returns {boolean}
 */
export const isAreaUnit = (unit) => AREA_UNITS.includes(unit)
