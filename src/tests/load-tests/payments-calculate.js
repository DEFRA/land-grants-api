/* eslint-disable import/no-unresolved */
// k6 run src/tests/load-tests/payments-calculate.js --env ACCESS_TOKEN=12345

import http from 'k6/http'
import { check } from 'k6'
import { defaultOptions, url, accessToken } from './options.js'

export const options = {
  ...defaultOptions
}

const payload = JSON.stringify({
  startDate: '2025-08-05',
  parcel: [
    {
      sheetId: 'SD6162',
      parcelId: '1911',
      actions: [
        {
          code: 'CMOR1',
          quantity: 4.5341
        }
      ]
    }
  ]
})

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  }
}

export default function () {
  const res = http.post(`${url}/payments/calculate`, payload, params)
  check(res, { 'status is 200': (r) => r.status === 200 })
}
