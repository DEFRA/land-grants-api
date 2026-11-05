import path from 'node:path'
import { processActionConfigFile } from '~/src/features/grants-config/service/grants-config.service.js'
import { getEntityByName } from '../../common/constants/entity_types.js'
import { importFileFromBucket } from '../service/import-file.service.js'
import { isCompatibilityMatrixIngested } from '../queries/isCompatibilityMatrixIngested.query.js'

const isActionConfigKey = (key) =>
  key.includes('/actions_config/') && key.endsWith('.json')

// Each CSV under actions/ is applied by the SQL for the entity of the same name
const ACTIONS_CSV_ENTITIES = [
  /** @type {EntityType} */ (getEntityByName('actions_eligibility'))
]

const COMPATIBILITY_MATRIX = /** @type {EntityType} */ (
  getEntityByName('compatibility_matrix')
)

/**
 * The compatibility matrix CSV in a manifest, e.g. 'compatibility_matrix/compatibility_matrix_0.1.0.csv'.
 * A manifest holds one config version, so at most one.
 * @param {string[]} manifest
 * @returns {string | undefined}
 */
const findCompatibilityMatrixKey = (manifest) =>
  manifest.find((key) =>
    path.matchesGlob(key, '**/compatibility_matrix/compatibility_matrix_*.csv')
  )

/**
 * The actions CSV files in a manifest, each with the entity that applies it.
 * A manifest holds one config version, so at most one of each.
 * @param {string[]} manifest
 * @returns {{ key: string, entityType: EntityType }[]}
 */
const findActionsCsvFiles = (manifest) =>
  ACTIONS_CSV_ENTITIES.flatMap((entityType) => {
    const key = manifest.find((manifestKey) =>
      manifestKey.endsWith(`/actions/${entityType?.name}.csv`)
    )
    return key ? [{ key, entityType }] : []
  })

/**
 * Process a single SQS message from the grants_config_broker_update queue.
 * Messages arrive via SNS raw delivery: body is the manifest array, attributes on message.MessageAttributes.
 * @param {import('@aws-sdk/client-sqs').Message} message - SQS message
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {{ grantsConfigBucket: string }} options
 * @returns {Promise<void>}
 */
async function processMessage(message, s3Client, db, logger, options) {
  const { grantsConfigBucket } = options

  logger.info(`Received SQS grants-config-broker message: ${message.MessageId}`)

  if (!message.Body) {
    throw new Error(`SQS message ${message.MessageId} has no body`)
  }

  const manifest = JSON.parse(message.Body)
  const grant = message.MessageAttributes?.grant?.StringValue
  const status = message.MessageAttributes?.status?.StringValue
  const version = message.MessageAttributes?.version?.StringValue

  if (grant !== 'land-grants') {
    logger.info(
      `Skipping grants-config message for grant="${grant}" version="${version}" (only "land-grants" is processed)`
    )
    return
  }

  if (status !== 'active') {
    logger.info(
      `Skipping grants-config message with status="${status}" grant="${grant}" version="${version}" (only "active" is processed)`
    )
    return
  }

  const actionKeys = manifest.filter(isActionConfigKey)
  const actionsCsvFiles = findActionsCsvFiles(manifest)
  const compatMatrixKey = findCompatibilityMatrixKey(manifest)

  if (
    actionKeys.length === 0 &&
    actionsCsvFiles.length === 0 &&
    !compatMatrixKey
  ) {
    logger.info(
      `No action config files found in manifest for grant="${grant}" version="${version}" — nothing to process`
    )
    return
  }

  logger.info(
    `Processing grants-config for grant="${grant}" version="${version}" (${actionKeys.length} action file(s), ${actionsCsvFiles.length} actions csv file(s), ${compatMatrixKey ? 1 : 0} compatibility matrix file(s))`
  )

  // Applied before the action configs: only the eligibility file creates actions rows,
  // and an action config can only update an existing one
  for (const { key, entityType } of actionsCsvFiles) {
    await importFileFromBucket(
      logger,
      s3Client,
      key,
      grantsConfigBucket,
      entityType
    )
  }

  for (const key of actionKeys) {
    await processActionConfigFile(logger, s3Client, db, key, grantsConfigBucket)
  }

  if (compatMatrixKey) {
    await importCompatibilityMatrix(
      logger,
      s3Client,
      db,
      compatMatrixKey,
      grantsConfigBucket
    )
  }
}

/**
 * Truncates and reloads compatibility_matrix from the file, unless that file has already been
 * ingested. Rows are tagged in updated_by with the filename, e.g. 'compatibility_matrix_0.1.0.csv'.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {string} key - S3 object key
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<void>}
 */
async function importCompatibilityMatrix(logger, s3Client, db, key, bucket) {
  const filename = path.posix.basename(key)

  if (await isCompatibilityMatrixIngested(logger, db, filename)) {
    logger.info(
      `Skipping compatibility_matrix file: ${key} (${filename} has already been ingested)`
    )
    return
  }

  await importFileFromBucket(
    logger,
    s3Client,
    key,
    bucket,
    COMPATIBILITY_MATRIX,
    filename
  )
}

export { processMessage }
/**
 * @import { EntityType } from '../../common/common.d.js'
 */
