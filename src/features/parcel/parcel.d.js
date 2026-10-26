/**
 * @typedef {object} LandCover
 * @property {string} landCoverClassCode - The land cover class code
 * @property {number} areaSqm - The area in square meters for the land cover
 */

/**
 * @typedef {object} LandParcelDb
 * @property {number} id
 * @property {string} sheet_id
 * @property {string} parcel_id
 * @property {number} area_sqm
 * @property {number} area
 * @property {string} geom
 * @property {Date} last_updated
 */

/**
 * @typedef {object} LandParcelBoundary
 * @property {number} boundaryLengthMeters
 */

/**
 * The views of the enabled-action config that every parcel in a request shares.
 * Neither depends on the parcel, so a request works them out once.
 * @typedef {object} PreparedActions
 * @property {Action[]} displayedActions - The enabled actions this request reports
 * @property {Record<string, string|undefined>} unitByActionCode - Configured unit of measurement by action code
 */

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 */
