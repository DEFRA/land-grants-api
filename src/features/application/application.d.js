/**
 * @typedef {object} RuleResult
 * @property {boolean} passed
 * @property {string} name
 * @property {string} description
 * @property {string} reason
 * @property {object[]} explanations
 */

/**
 * @typedef {object} ActionResult
 * @property {boolean} hasPassed
 * @property {string} code
 * @property {string} actionConfigVersion
 * @property {RuleResult[]} rules
 * @property {AvailableAreaResult} availableArea
 */

/**
 * @typedef {object} AvailableAreaResult
 * @property {number} areaInHa
 * @property {ExplanationSection[]} explanations
 */

/**
 * @typedef {object} ParcelResult
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {ActionResult[]} actions
 */

/**
 * @typedef {object} ActionRequest
 * @property {string} code
 * @property {number} quantity
 */

/**
 * @typedef {object} Parcel
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {ActionRequest[]} actions
 */

/**
 * @typedef {object} Application
 * @property {string} applicantCrn
 * @property {Parcel[]} parcels
 */

/**
 * @typedef {object} ApplicationResult
 * @property {number} id
 * @property {string} application_id
 * @property {string} sbi
 * @property {string} crn
 * @property {ApplicationValidationRun} data
 * @property {Date} created_at
 */

/**
 * @typedef {object} ApplicationValidationRunList
 * @property {number} id
 * @property {Date} created_at
 */

/**
 * @typedef {object} ApplicationValidationError
 * @property {string} description
 * @property {boolean} passed
 */

// /**
//  * @typedef {object} ApplicationResultData
//  * @property {Date} date
//  * @property {string} requester
//  * @property {string} landGrantsApiVersion
//  * @property {boolean} hasPassed
//  * @property {Application} application
//  * @property {ParcelResult[]} parcelLevelResults
//  * @property {object} availableArea
//  * @property {Date} created_at
//  */

/**
 * @typedef {object} ApplicationValidationRun
 * @property {Date} date
 * @property {string} applicationId
 * @property {string} applicantCrn
 * @property {string} sbi
 * @property {string} requester
 * @property {string} landGrantsApiVersion
 * @property {boolean} hasPassed
 * @property {object} applicationLevelResults
 * @property {ApplicationResponse} application
 * @property {ParcelResult[]} parcelLevelResults
 */

/**
 * @typedef {object} ApplicationResponse
 * @property {Parcel[]} parcels
 * @property {object[]} agreementLevelActions
 */

/** @import {ExplanationSection} from "~/src/features/available-area/explanations.d.js" */
