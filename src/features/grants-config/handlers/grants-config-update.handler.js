import { processActionConfigFile } from '~/src/features/grants-config/service/grants-config.service.js'

/**
 * Process a single SQS message from the grants_config_broker_update queue.
 * Handles both SNS-wrapped messages (production) and raw messages (local testing).
 * @param {import('@aws-sdk/client-sqs').Message} message - SQS message
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {{ grantsConfigBucket: string }} options
 * @returns {Promise<void>}
 */
async function processMessage(message, s3Client, db, logger, options) {
  const { grantsConfigBucket } = options

  if (!message.Body) {
    throw new Error(`SQS message ${message.MessageId} has no body`)
  }

  const body = JSON.parse(message.Body)

  let manifest
  let status
  let grant

  if (body.Type === 'Notification' && body.Message) {
    manifest = JSON.parse(body.Message)
    status = body.MessageAttributes?.status?.Value
    grant = body.MessageAttributes?.grant?.Value
  } else {
    manifest = body.manifest ?? []
    status = body.status
    grant = body.grant
  }

  if (grant !== 'land-grants') {
    logger.info(
      `Skipping grants-config message for grant="${grant}" (only "land-grants" is processed)`
    )
    return
  }

  if (status !== 'active') {
    logger.info(
      `Skipping grants-config message with status="${status}" (only "active" is processed)`
    )
    return
  }

  const actionKeys = manifest.filter((key) => key.includes('/actions/'))

  if (actionKeys.length === 0) {
    logger.info('No action config files found in manifest — nothing to process')
    return
  }

  for (const key of actionKeys) {
    await processActionConfigFile(logger, s3Client, db, key, grantsConfigBucket)
  }
}

export { processMessage }
