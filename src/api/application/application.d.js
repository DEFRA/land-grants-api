/**
 * @typedef {object} RuleResult
 * @property {boolean} hasPassed
 * @property {string} name
 * @property {string} reason
 * @property {object[]} explanations
 */

/**
 * @typedef {object} ActionResult
 * @property {boolean} hasPassed
 * @property {string} code
 * @property {string} actionConfigVersion
 * @property {object[]} rules
 */

/**
 * @typedef {object} ParcelResult
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {ActionResult[]} actions
 */

/**
 * @typedef {object} Action
 * @property {string} code
 * @property {number} quantity
 */

/**
 * @typedef {object} Parcel
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {Action[]} actions
 */

/**
 * @typedef {object} Application
 * @property {string} applicantCrn
 * @property {Parcel[]} parcels
 */

/**
 * @typedef {object} ApplicationResultData
 * @property {Date} date
 * @property {string} requester
 * @property {string} landGrantsApiVersion
 * @property {boolean} hasPassed
 * @property {Application} application
 * @property {ParcelResult[]} parcelLevelResults
 * @property {object} availableArea
 * @property {Date} created_at
 */

/**
 * @typedef {object} ApplicationResult
 * @property {number} id
 * @property {string} application_id
 * @property {string} sbi
 * @property {string} crn
 * @property {ApplicationResultData} data
 * @property {Date} created_at
 */
