/* eslint-disable import/no-unresolved */
import { accessTokenLocal } from './config.js'

/* eslint-disable no-undef */
const { AUTH_HEADER_TOKEN } = __ENV

export const defaultOptions = {
  vus: 100, // equivalent to -c 20 (20 concurrent users)
  duration: '30s' // equivalent to -d 30 (run for 30 seconds)
}

export const url = 'http://localhost:3001'
export const accessToken = AUTH_HEADER_TOKEN || accessTokenLocal
