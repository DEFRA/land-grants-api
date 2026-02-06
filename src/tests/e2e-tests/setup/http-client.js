import { request } from 'undici'
import { TEST_PORT } from './test-config.js'

let baseUrl = `http://localhost:${TEST_PORT}`

export function setBaseUrl(url) {
  baseUrl = url
}

/**
 * @param {string} path - Request path
 * @param {object} options - Request options
 * @param {object} options.headers - Request headers
 * @returns {Promise<{status: number, data: any, headers: object}>}
 */
export async function get(path, options = { headers: {} }) {
  const url = `${baseUrl}${path}`
  const response = await request(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const status = response.statusCode
  const headers = response.headers
  let data

  const body = await response.body.text()

  try {
    data = body ? JSON.parse(body) : null
  } catch {
    data = body
  }

  return { status, data, headers }
}

/**
 * @param {string} path - Request path
 * @param {object} options - Request options
 * @param {object} options.headers - Request headers
 * @param {object} options.body - Request body
 * @returns {Promise<{status: number, data: any, headers: object}>}
 */
export async function post(path, options = { headers: {}, body: {} }) {
  const url = `${baseUrl}${path}`
  const response = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  const status = response.statusCode
  const headers = response.headers
  let data

  const body = await response.body.text()

  try {
    data = body ? JSON.parse(body) : null
  } catch {
    data = body
  }

  return { status, data, headers }
}

export const httpClient = {
  get,
  post,
  setBaseUrl
}
