export const validateApplicationRequest = async (server, body) => {
  const request = {
    method: 'POST',
    url: '/application/validate',
    payload: body
  }

  const { statusCode, payload } = await server.inject(request)
  const result = JSON.parse(payload)
  return { validateStatusCode: statusCode, validateResult: result }
}

export const getApplicationValidationRunRequest = async (server, id) => {
  const request = {
    method: 'POST',
    url: `/application/validation-run/${id}`
  }

  const { statusCode, payload } = await server.inject(request)
  const result = JSON.parse(payload)
  return { getStatusCode: statusCode, getResult: result }
}

export const getApplicationValidationRunsRequest = async (
  server,
  applicationId,
  fields
) => {
  const request = {
    method: 'POST',
    url: `/application/${applicationId}/validation-run`,
    payload: {
      fields
    }
  }

  const { statusCode, payload } = await server.inject(request)
  const result = JSON.parse(payload)
  return { getStatusCode: statusCode, getResult: result }
}

export const applicationRequest = {
  applicationId: 'app-validation-test1',
  requester: 'grants-ui',
  applicantCrn: '1102760349',
  sbi: '121428499',
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
}
