import { processActionConfigFile } from '~/src/features/grants-config/service/grants-config.service.js'

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

  logger.info(
    `Received SQS grants-config-broker message: ${JSON.stringify(message, null, 2)}`
  )

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

  const actionKeys = manifest.filter((key) => key.includes('/actions/'))

  if (actionKeys.length === 0) {
    logger.info(
      `No action config files found in manifest for grant="${grant}" version="${version}" — nothing to process`
    )
    return
  }

  logger.info(
    `Processing grants-config for grant="${grant}" version="${version}" (${actionKeys.length} action file(s))`
  )

  for (const key of actionKeys) {
    await processActionConfigFile(logger, s3Client, db, key, grantsConfigBucket)
  }
}

export { processMessage }
