import fetch from 'node-fetch'
import { config } from '~/src/config/index.js'

const CV_API_ENDPOINT = config.get('consolidatedView.apiEndpoint')
const CV_API_AUTH_TOKEN = config.get('consolidatedView.authToken')
const CV_API_AUTH_EMAIL = config.get('consolidatedView.authEmail')

export async function findBusinessDetails(
  sbi,
  crn,
  headers = {},
  variables = {}
) {
  const query = `
query Business {
    business(sbi: "${sbi}") {
        sbi
        organisationId
        customer(crn: "${crn}") {
            firstName
            lastName
            role
        }
    }
}
  `

  const response = await fetch(CV_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CV_API_AUTH_TOKEN}`,
      email: CV_API_AUTH_EMAIL,
      ...headers
    },
    body: JSON.stringify({
      query,
      variables
    })
  })

  if (!response.ok) {
    const error = new Error(response.statusText)
    error.code = response.status
    throw error
  }

  return await response.json()
}
