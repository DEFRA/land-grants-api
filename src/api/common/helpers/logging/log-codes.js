export const LogCodes = {
  DATABASE: {
    OPERATION_FAILED: (operation) => `Database operation failed: ${operation}`
  },
  VALIDATION: {
    FAILED: (operation) => `Validation failed: ${operation}`
  },
  RESOURCE: {
    NOT_FOUND: (resourceType) => `${resourceType} not found`
  },
  BUSINESS: {
    OPERATION_FAILED: (operation) => `Business operation failed: ${operation}`
  }
}
