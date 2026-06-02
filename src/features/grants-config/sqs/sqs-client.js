import { SQSClient } from '@aws-sdk/client-sqs'
import { Consumer } from 'sqs-consumer'
import { config } from '~/src/config/index.js'
import { processMessage } from '~/src/features/grants-config/handlers/grants-config-update.handler.js'

export const grantsConfigSqsPlugin = {
  plugin: {
    name: 'grantsConfigSqs',
    version: '1.0.0',
    register(server, options) {
      server.logger.info('Setting up grants-config-broker SQS consumer')

      const sqsClient = new SQSClient({
        region: options.sqsRegion,
        endpoint: options.sqsEndpoint
      })

      const app = Consumer.create({
        queueUrl: options.queueUrl,
        handleMessage: async (message) => {
          try {
            await processMessage(
              message,
              server.s3,
              server.postgresDb,
              server.logger,
              {
                grantsConfigBucket: options.grantsConfigBucket
              }
            )
            server.logger.info(
              `Successfully processed grants-config-broker message: ${message.MessageId}`
            )
          } catch (err) {
            server.logger.error(
              err,
              'Failed to process grants-config-broker message'
            )
            throw err
          }
        },
        sqs: sqsClient,
        batchSize: 1,
        waitTimeSeconds: 20,
        visibilityTimeout: 30,
        handleMessageTimeout: 30000,
        attributeNames: ['All'],
        messageAttributeNames: ['All']
      })

      app.on('error', (err) => {
        server.logger.error(err, 'grants-config-broker SQS Consumer error')
      })

      app.on('processing_error', (err) => {
        server.logger.error(
          err,
          'grants-config-broker SQS message processing error'
        )
      })

      app.on('started', () => {
        server.logger.info('grants-config-broker SQS Consumer started')
      })

      app.start()

      server.events.on('stop', () => {
        server.logger.info('Stopping grants-config-broker SQS consumer')
        app.stop()
        server.logger.info('Closing grants-config-broker SQS client')
        sqsClient.destroy()
      })
    }
  },
  options: {
    sqsRegion: config.get('sqs.region'),
    sqsEndpoint: config.get('sqs.endpoint'),
    queueUrl: config.get('sqs.queueUrl'),
    grantsConfigBucket: config.get('grantsConfig.s3Bucket')
  }
}
