import { Readable } from 'node:stream'
import { getFile } from '~/src/features/common/s3/s3.js'
import { importData } from '~/src/features/land-data-ingest/service/import-land-data.service.js'

/**
 * Download an actions CSV published with the land-grants config from S3 and apply it to the actions table.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {string} s3Key - S3 object key, e.g. 'land-grants/0.24.0/actions/actions_mapping.csv'
 * @param {string} bucket - S3 bucket name
 * @param {string} entityName - Selects the SQL that applies it, e.g. 'actions_mapping'
 * @returns {Promise<void>}
 */
async function processActionsCsvFile(
  logger,
  s3Client,
  s3Key,
  bucket,
  entityName
) {
  logger.info(`Processing ${entityName} file: ${s3Key}`)

  const response = await getFile(s3Client, bucket, s3Key)
  const stream = Readable.fromWeb(response.Body.transformToWebStream())

  await importData(
    stream,
    { name: entityName, truncateTable: false },
    s3Key,
    undefined,
    logger
  )

  logger.info(`Successfully applied ${entityName} file: ${s3Key}`)
}

export { processActionsCsvFile }
