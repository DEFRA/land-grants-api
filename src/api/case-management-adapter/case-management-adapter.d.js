/**
 * @typedef {object} HeadingComponent
 * @property {string} [id]
 * @property {string} component
 * @property {string} text
 * @property {number} level
 */

/**
 * @typedef {object} ParagraphComponent
 * @property {string} component
 * @property {string} text
 */

/**
 * @typedef {object} StatusComponent
 * @property {string} component
 * @property {string} text
 * @property {string} colour
 * @property {string} [classes]
 */

/**
 * @typedef {object} DetailsSummaryItem
 * @property {string} text
 * @property {string} [classes]
 * @property {string} [component]
 * @property {string} [colour]
 */

/**
 * @typedef {object} DetailsComponent
 * @property {string} component
 * @property {DetailsSummaryItem[]} summaryItems
 * @property {ValidationComponent[]} items
 */

/**
 * @typedef {HeadingComponent | ParagraphComponent | StatusComponent | DetailsComponent} ValidationComponent
 */

/**
 * @typedef {ValidationComponent[]} CaseManagementValidationResponse
 */
