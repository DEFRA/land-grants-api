/* eslint-disable import/no-unresolved */
// k6 run src/tests/load-tests/application-validate.js

import http from 'k6/http'
import { check } from 'k6'
import { defaultOptions, url, accessToken } from './options.js'

export const options = {
  ...defaultOptions
}

const payload = JSON.stringify({
  applicationId: 'app-validation-test1',
  requester: 'grants-ui',
  applicantCrn: '1102760349',
  sbi: 121428499,
  landActions: [
    {
      parcelId: '8936',
      sheetId: 'SD7553',
      actions: [
        {
          code: 'UPL1',
          quantity: 6.1653
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
  const res = http.post(`${url}/application/validate`, payload, params)
  check(res, { 'status is 200': (r) => r.status === 200 })
}
