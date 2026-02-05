/* eslint-disable import/no-unresolved */
// k6 run src/tests/load-tests/parcels.js

import http from 'k6/http'
import { check } from 'k6'
import { defaultOptions, url, accessToken } from './options.js'

export const options = {
  ...defaultOptions
}

const payload = JSON.stringify({
  fields: ['size', 'actions'],
  parcelIds: ['SD8447-1509']
  // plannedActions: [
  //   { actionCode: 'CHRW1', quantity: 1, unit: 'ha' },
  //   { actionCode: 'CHRW2', quantity: 1, unit: 'ha' }
  // ]
})

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  }
}

export default function () {
  const res = http.post(`${url}/parcels`, payload, params)
  check(res, { 'status is 200': (r) => r.status === 200 })
}
