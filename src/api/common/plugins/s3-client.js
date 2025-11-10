import { S3Client } from '@aws-sdk/client-s3'
import { config } from '../../../config/index.js'

const options = {
  region: config.get('s3.region'),
  endpoint: config.get('s3.endpoint'),
  bucket: config.get('s3.bucket'),
  forcePathStyle:
    config.get('isLocal') || config.get('isDevelopment') || config.get('isTest')
}

function createS3Client() {
  return new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.forcePathStyle
  })
}

const s3Client = {
  plugin: {
    name: 's3Client',
    version: '0.1.0',
    register(server) {
      const client = createS3Client()
      server.decorate('request', 's3', client)
      server.decorate('server', 's3', client)

      server.events.on('stop', () => {
        server.logger.info(`Closing S3 client`)
        client.destroy()
      })
    }
  },
  options
}

export { s3Client, createS3Client }
