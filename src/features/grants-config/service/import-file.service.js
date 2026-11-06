import { Readable } from 'node:stream'
import { getFile } from '~/src/features/common/s3/s3.js'
import { importData } from '~/src/features/land-data-ingest/service/import-land-data.service.js'

/**
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {string} s3Key - S3 object key, e.g. 'land-grants/0.24.0/actions/actions_eligibility.csv'
 * @param {string} bucket - S3 bucket name
 * @param {import('../../common/common.d.js').EntityType} entityType
 * @param {string} [ingestId] - Tags the imported rows; defaults to the S3 key
 * @returns {Promise<void>}
 */
async function importFileFromBucket(
  logger,
  s3Client,
  s3Key,
  bucket,
  entityType,
  ingestId = s3Key
) {
  logger.info(`Processing ${entityType.name} file: ${s3Key}`)

  const response = await getFile(s3Client, bucket, s3Key)
  const stream = Readable.fromWeb(response.Body.transformToWebStream())

  await importData(stream, entityType, ingestId, undefined, logger)

  logger.info(`Successfully applied ${entityType.name} file: ${s3Key}`)
}

export { importFileFromBucket }
