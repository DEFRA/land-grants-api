import { config } from '~/src/config/index.js'

export const DB_CONFIG = {
  host: config.get('postgres.host'),
  user: config.get('postgres.user'),
  database: config.get('postgres.database'),
  password: config.get('postgres.passwordForLocalDev')
}

export const TEST_PORT = 3002

export const AUTH_CONFIG = {
  token: process.env.AUTH_HEADER_TOKEN
}
