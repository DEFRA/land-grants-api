/* eslint-disable no-undef */
const { TEST_ENV } = __ENV

export const defaultOptions = {
  vus: 20, // equivalent to -c 20 (20 concurrent users)
  duration: '30s' // equivalent to -d 30 (run for 30 seconds)
}

export const url =
  TEST_ENV === 'dev'
    ? 'https://land-grants-api.dev.cdp-int.defra.cloud'
    : 'http://localhost:3001'
