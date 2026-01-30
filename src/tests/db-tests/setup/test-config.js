import { config } from '~/src/config/index.js'

export const DB_CONFIG = {
  host: config.get('postgres.host'),
  user: config.get('postgres.user'),
  database: config.get('postgres.database'),
  password: config.get('postgres.passwordForLocalDev')
}

export const S3_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  bucket: config.get('s3.bucket')
}
