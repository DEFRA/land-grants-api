import { config } from '~/src/config/index.js'

export const DB_CONFIG = {
  host: config.get('postgres.host'),
  user: config.get('postgres.user'),
  database: config.get('postgres.database'),
  password: config.get('postgres.passwordForLocalDev')
}

export const DDL_DB_CONFIG = {
  host: config.get('postgres.host'),
  user: process.env.POSTGRES_DDL_USER || 'land_grants_api_ddl',
  database: config.get('postgres.database'),
  password: process.env.POSTGRES_DDL_PASSWORD || 'land_grants_api'
}

export const S3_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  bucket: config.get('s3.bucket')
}
