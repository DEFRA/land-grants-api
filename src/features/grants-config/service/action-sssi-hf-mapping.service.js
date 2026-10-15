import { Readable } from 'node:stream'
import { getFile } from '~/src/features/common/s3/s3.js'
import { importData } from '~/src/features/land-data-ingest/service/import-land-data.service.js'

// Published with the land-grants config rather than ingested as land data, so it
// is not one of the ENTITY_TYPES. The name selects the action_sssi_hf_mapping SQL.
/** @type {import('~/src/features/common/common.d.js').EntityType} */
const entityType = { name: 'action_sssi_hf_mapping', truncateTable: false }

/**
 * Download the action SSSI/HF mapping CSV from S3 and apply it to the actions table.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {string} s3Key - S3 object key, e.g. 'land-grants/0.24.0/actions/action_sssi_hf_mapping.csv'
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<void>}
 */
async function processActionSssiHfMappingFile(logger, s3Client, s3Key, bucket) {
  logger.info(`Processing action sssi hf mapping file: ${s3Key}`)

  const response = await getFile(s3Client, bucket, s3Key)
  const stream = Readable.fromWeb(response.Body.transformToWebStream())

  await importData(stream, entityType, s3Key, undefined, logger)

  logger.info(`Successfully applied action sssi hf mapping file: ${s3Key}`)
}

export { processActionSssiHfMappingFile }
