import { processActionConfigFile } from '~/src/features/grants-config/service/grants-config.service.js'
import { processActionsCsvFile } from '~/src/features/grants-config/service/actions-csv.service.js'

const isActionConfigKey = (key) =>
  key.includes('/actions_config/') && key.endsWith('.json')

// Each CSV under actions/ is applied by the SQL for the entity of the same name
const ACTIONS_CSV_ENTITIES = ['actions_eligibility']

/**
 * The actions CSV files in a manifest, each with the entity that applies it.
 * A manifest holds one config version, so at most one of each.
 * @param {string[]} manifest
 * @returns {{ key: string, entityName: string }[]}
 */
const findActionsCsvFiles = (manifest) =>
  ACTIONS_CSV_ENTITIES.flatMap((entityName) => {
    const key = manifest.find((manifestKey) =>
      manifestKey.endsWith(`/actions/${entityName}.csv`)
    )
    return key ? [{ key, entityName }] : []
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

  if (actionKeys.length === 0 && actionsCsvFiles.length === 0) {
    logger.info(
      `No action config files found in manifest for grant="${grant}" version="${version}" — nothing to process`
    )
    return
  }

  logger.info(
    `Processing grants-config for grant="${grant}" version="${version}" (${actionKeys.length} action file(s), ${actionsCsvFiles.length} actions csv file(s))`
  )

  // Applied before the action configs: only the eligibility file creates actions rows,
  // and an action config can only update an existing one
  for (const { key, entityName } of actionsCsvFiles) {
    await processActionsCsvFile(
      logger,
      s3Client,
      key,
      grantsConfigBucket,
      entityName
    )
  }

  for (const key of actionKeys) {
    await processActionConfigFile(logger, s3Client, db, key, grantsConfigBucket)
  }
}

export { processMessage }
