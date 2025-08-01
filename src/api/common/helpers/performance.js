export const startTiming = () => {
  const start = Date.now()
  return start
}

export const endTiming = (logger, operation, start, success) => {
  const end = Date.now()
  const duration = end - start

  const message = `${operation} ${success ? 'completed successfully' : 'failed'} and took ${duration}ms`

  logger.info(message)
}
