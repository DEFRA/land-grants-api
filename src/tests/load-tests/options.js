import { accessTokenLocal } from './config.js' // eslint-disable-line import/no-unresolved

const { AUTH_HEADER_TOKEN } = process.env

export const defaultOptions = {
  vus: 100, // equivalent to -c 20 (20 concurrent users)
  duration: '30s' // equivalent to -d 30 (run for 30 seconds)
}

export const url = 'http://localhost:3001'
export const accessToken = AUTH_HEADER_TOKEN ?? accessTokenLocal
