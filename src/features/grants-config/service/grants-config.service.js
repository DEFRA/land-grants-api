import { getFile } from '~/src/features/common/s3/s3.js'
import { getActionConfigByVersion } from '~/src/features/grants-config/queries/getActionConfigByVersion.query.js'
import { insertActionConfig } from '~/src/features/grants-config/queries/insertActionConfig.query.js'
import { transformActionConfig } from '~/src/features/grants-config/transforms/action-config.transform.js'

/**
 * Check if the action config version already exists in the DB; if not, download from S3 and insert.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {string} s3Key - S3 object key, e.g. 'land-grants/0.0.2/actions/PA3/pa3-1.0.0.json'
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<void>}
 */
async function processActionConfigFile(logger, s3Client, db, s3Key, bucket) {
  logger.info(`Processing action config file: ${s3Key}`)

  const response = await getFile(s3Client, bucket, s3Key)
  const json = JSON.parse(await response.Body.transformToString())

  const { code, semanticVersion, major, minor, patch, displayOrder, config } =
    transformActionConfig(json)

  const exists = await getActionConfigByVersion(
    logger,
    db,
    code,
    semanticVersion
  )

  if (exists) {
    logger.info(
      `Action config already exists: code=${code} semanticVersion=${semanticVersion} — skipping`
    )
    return
  }

  logger.info(
    `Inserting new action config: code=${code} semanticVersion=${semanticVersion}`
  )

  const inserted = await insertActionConfig(logger, db, {
    code,
    config,
    major,
    minor,
    patch,
    displayOrder
  })

  if (!inserted) {
    throw new Error(
      `Failed to insert action config: code=${code} semanticVersion=${semanticVersion}`
    )
  }

  logger.info(
    `Successfully inserted action config: code=${code} semanticVersion=${semanticVersion}`
  )
}

export { processActionConfigFile }
