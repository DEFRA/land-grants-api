/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
// brew install k6

import http from 'k6/http'
import { check } from 'k6'
import { url, defaultOptions } from './options.js'

export const options = {
  ...defaultOptions
}

export default function () {
  const res = http.get(`${url}/health`)
  check(res, { 'status is 200': (r) => r.status === 200 })
}
