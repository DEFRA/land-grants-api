/**
 * @typedef {object} Task
 * @property {string} category
 * @property {string} title
 * @property {number} taskId
 * @property {string} bucket
 */

/**
 * @typedef {object} InitiateUploaderResponse
 * @property {string} uploadId
 * @property {string} uploadUrl
 * @property {string} statusUrl
 */

/**
 * @typedef {object} Ingest
 * @property {number} id
 * @property {string} entity
 * @property {string} status
 * @property {Date} start_date
 * @property {Date} completed_date
 */

/**
 * @typedef {object} IngestFile
 * @property {number} id
 * @property {string} ingest_id
 * @property {string} filename
 * @property {number} total_rows
 * @property {string} status
 */

/**
 * @typedef {Ingest & {files: IngestFile[]}} IngestWithFiles
 */
