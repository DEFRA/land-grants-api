/* eslint-disable no-console */
const showLogs = false

/**
 * Logger for testing purposes
 * @type {import('pino').Logger}
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const logger = {
  level: 'info',
  info: showLogs ? console.info : jest.fn(),
  error: showLogs ? console.error : jest.fn(),
  warn: showLogs ? console.warn : jest.fn(),
  debug: showLogs ? console.debug : jest.fn(),
  fatal: showLogs ? console.error : jest.fn(),
  trace: showLogs ? console.trace : jest.fn(),
  silent: showLogs ? console.info : jest.fn()
}
