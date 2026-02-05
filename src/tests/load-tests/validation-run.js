/* eslint-disable import/no-unresolved */
// k6 run src/tests/load-tests/validation-run.js --env ACCESS_TOKEN=12345

import http from 'k6/http'
import { check } from 'k6'
import { defaultOptions, url, accessToken } from './options.js'

export const options = {
  ...defaultOptions
}

const payload = JSON.stringify({
  fields: ''
})

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  }
}

export default function () {
  const res = http.post(`${url}/application/validation-run/1`, payload, params)
  check(res, { 'status is 200': (r) => r.status === 200 })
}
