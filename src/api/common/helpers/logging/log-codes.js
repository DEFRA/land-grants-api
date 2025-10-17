export const LogCodes = {
  DATABASE: {
    OPERATION_FAILED: {
      method: 'error',
      messageFn: (operation) => `Database operation failed: ${operation}`
    }
  },
  VALIDATION: {
    FAILED: {
      method: 'warn',
      messageFn: (operation) => `Validation failed: ${operation}`
    }
  },
  RESOURCE: {
    NOT_FOUND: {
      method: 'warn',
      messageFn: (resourceType) => `${resourceType} not found`
    }
  },
  BUSINESS: {
    OPERATION_FAILED: {
      method: 'error',
      messageFn: (operation) => `Business operation failed: ${operation}`
    }
  }
}
