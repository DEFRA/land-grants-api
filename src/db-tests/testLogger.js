/* eslint-disable no-console */
/**
 * Logger for testing purposes
 * @type {import('pino').Logger}
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const logger = {
  info: console.info,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
  level: 'info',
  fatal: console.error,
  trace: console.trace,
  silent: console.info
}
