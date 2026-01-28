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
  info: showLogs ? console.info : vi.fn(),
  error: showLogs ? console.error : vi.fn(),
  warn: showLogs ? console.warn : vi.fn(),
  debug: showLogs ? console.debug : vi.fn(),
  fatal: showLogs ? console.error : vi.fn(),
  trace: showLogs ? console.trace : vi.fn(),
  silent: showLogs ? console.info : vi.fn()
}
