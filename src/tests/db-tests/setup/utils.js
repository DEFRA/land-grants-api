export const createResponseCapture = () => {
  let responseData = null
  let statusCode = null

  const h = {
    response: (data) => {
      responseData = data
      return {
        code: (code) => {
          statusCode = code
          return { data: responseData, statusCode }
        }
      }
    }
  }

  return {
    h,
    getResponse: () => ({ data: responseData, statusCode })
  }
}

export const createHandler = (
  parcelIds,
  fields,
  plannedActions,
  logger,
  connection
) => {
  return {
    payload: {
      parcelIds,
      fields,
      plannedActions
    },
    logger,
    server: {
      postgresDb: connection
    }
  }
}
